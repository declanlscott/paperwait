package handler

import (
	"context"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"tailscale.com/tsnet"
)

const (
	hostname          = "printworks"
	endpointParamName = "/papercut/web-services/endpoint"
	authKeyParamName  = "/tailscale/auth-key"
	tailscaleDir      = "/tmp/tailscale"
	cleanupTimeout    = 1800 * time.Millisecond // Lambda shutdown phase is capped at 2 seconds
)

var (
	tailscale    *tsnet.Server
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
		Name: aws.String(endpointParamName),
	})
	if err != nil {
		log.Fatalf("Failed to get endpoint parameter: %v", err)
	}

	target, err := url.Parse(*output.Parameter.Value)
	if err != nil {
		log.Fatalf("Failed to parse endpoint URL: %v", err)
	}

	output, err = ssmClient.GetParameter(ctx, &ssm.GetParameterInput{
		Name:           aws.String(authKeyParamName),
		WithDecryption: aws.Bool(true),
	})
	if err != nil {
		log.Fatalf("Failed to get auth key parameter: %v", err)
	}

	tailscale = &tsnet.Server{
		Dir:       tailscaleDir,
		Hostname:  hostname,
		AuthKey:   *output.Parameter.Value,
		Ephemeral: true,
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.Transport = tailscale.HTTPClient().Transport

	proxyAdapter = httpadapter.New(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			proxy.ServeHTTP(w, r)
		}))
}

func Handler(
	ctx context.Context,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
	return proxyAdapter.ProxyWithContext(ctx, req)
}

func cleanup() {
	cleanupOnce.Do(func() {
		if tailscale == nil {
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), cleanupTimeout)
		defer cancel()

		done := make(chan struct{})
		go func() {
			log.Println("Shutting down Tailscale server...")

			if err := tailscale.Close(); err != nil {
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
