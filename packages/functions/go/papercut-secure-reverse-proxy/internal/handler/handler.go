package handler

import (
	"context"
	"errors"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"papercut-secure-reverse-proxy/internal/utils"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"tailscale.com/client/tailscale"
	"tailscale.com/tsnet"
)

const (
	hostnamePrefix   = "printworks-"
	targetParamName  = "/papercut/server/url"
	authKeyParamName = "/tailscale/auth-key"
	tailscaleDir     = "/tmp/tailscale"
	cleanupTimeout   = 1800 * time.Millisecond // Lambda shutdown phase is capped at 2 seconds
)

var (
	server       *tsnet.Server
	proxyAdapter *httpadapter.HandlerAdapter
	cleanupOnce  sync.Once
)

func init() {
	ctx := context.Background()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan,
		syscall.SIGTERM, // Lambda shutdown signal
		syscall.SIGINT,  // Terminal Ctrl+C interrupt
		syscall.SIGHUP,  // Terminal disconnect
	)

	go func() {
		sig := <-sigChan
		log.Printf("Received signal %v, cleaning up", sig)
		cleanup()
	}()

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatalf("Failed to load AWS SDK configuration: %v", err)
	}

	ssmClient := ssm.NewFromConfig(cfg)

	output, err := ssmClient.GetParameter(ctx, &ssm.GetParameterInput{
		Name: aws.String(targetParamName),
	})
	if err != nil {
		log.Fatalf("Failed to get target parameter: %v", err)
	}

	target, err := url.Parse(*output.Parameter.Value)
	if err != nil {
		log.Fatalf("Failed to parse target URL: %v", err)
	}

	output, err = ssmClient.GetParameter(ctx, &ssm.GetParameterInput{
		Name:           aws.String(authKeyParamName),
		WithDecryption: aws.Bool(true),
	})
	if err != nil {
		log.Fatalf("Failed to get auth key parameter: %v", err)
	}

	_ = os.Setenv("TSNET_FORCE_LOGIN", "1")

	server = &tsnet.Server{
		Dir:       tailscaleDir,
		Hostname:  hostnamePrefix + utils.RandomString(8),
		AuthKey:   *output.Parameter.Value,
		Ephemeral: true,
	}
	if _, err := server.Up(ctx); err != nil {
		log.Fatalf("Failed to start Tailscale server: %v", err)
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.Transport = server.HTTPClient().Transport

	proxyAdapter = httpadapter.New(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			proxy.ServeHTTP(w, r)
		}))
}

func Handler(
	ctx context.Context,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
	req.Path = strings.TrimPrefix(req.Path, "/papercut")

	return proxyAdapter.ProxyWithContext(ctx, req)
}

func cleanup() {
	cleanupOnce.Do(func() {
		if server == nil {
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), cleanupTimeout)
		defer cancel()

		done := make(chan struct{})
		go func() {
			if err := func() error {
				tailscale.I_Acknowledge_This_API_Is_Unstable = true

				client, err := server.APIClient()
				if err != nil {
					return err
				}

				devices, err := client.Devices(ctx, tailscale.DeviceAllFields)
				if err != nil {
					return err
				}

				for _, device := range devices {
					if device.Hostname == server.Hostname {
						log.Printf("Deleting Tailscale device %q...", device.DeviceID)
						if err := client.DeleteDevice(ctx, device.DeviceID); err != nil {
							return err
						}

						return nil
					}
				}

				return errors.New("tailscale device not found")
			}(); err != nil {
				log.Printf("Failed to delete Tailscale device: %v", err)
			}

			log.Println("Shutting down Tailscale server...")
			if err := server.Close(); err != nil {
				log.Printf("Failed to shut down Tailscale server: %v", err)
			}

			close(done)
		}()

		select {
		case <-ctx.Done():
			log.Println("Cleanup timed out")
		case <-done:
			log.Println("Cleanup completed successfully")
		}
	})
}
