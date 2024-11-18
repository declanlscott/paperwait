package lifecycle

import (
	"context"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"syscall"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"tailscale.com/tsnet"
)

func Startup() {
	ctx := context.Background()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan,
		syscall.SIGTERM, // Lambda shutdown signal
		syscall.SIGINT,  // Terminal Ctrl+C interrupt
		syscall.SIGHUP,  // Terminal disconnect
	)

	go func() {
		sig := <-sigChan
		log.Printf("Received signal %v, cleaning up\n", sig)
		cleanup(ctx)
	}()

	params, err := getParams(ctx)
	if err != nil {
		log.Fatalf("Failed to get parameters: %v", err)
	}

	_ = os.Setenv("TSNET_FORCE_LOGIN", "1")

	server = &tsnet.Server{
		Dir:       tailscaleDir,
		Hostname:  hostname,
		AuthKey:   params.authKey,
		Ephemeral: true,
	}
	if _, err := server.Up(ctx); err != nil {
		log.Fatalf("Failed to start Tailscale server: %v", err)
	}

	proxy := httputil.NewSingleHostReverseProxy(params.target)
	proxy.Transport = server.HTTPClient().Transport

	HandlerAdapter = httpadapter.New(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			proxy.ServeHTTP(w, r)
		}))
}

type params struct {
	target  *url.URL
	authKey string
}

func getParams(ctx context.Context) (*params, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatalf("Failed to load AWS SDK configuration: %v", err)
	}

	client := ssm.NewFromConfig(cfg)

	output, err := client.GetParameter(ctx, &ssm.GetParameterInput{
		Name: aws.String(targetParamName),
	})
	if err != nil {
		log.Printf("Failed to get target parameter: %v\n", err)
		return nil, err
	}

	target, err := url.Parse(*output.Parameter.Value)
	if err != nil {
		log.Printf("Failed to parse target URL: %v\n", err)
		return nil, err
	}

	output, err = client.GetParameter(ctx, &ssm.GetParameterInput{
		Name:           aws.String(authKeyParamName),
		WithDecryption: aws.Bool(true),
	})
	if err != nil {
		log.Printf("Failed to get auth key parameter: %v\n", err)
		return nil, err
	}

	return &params{
		target:  target,
		authKey: *output.Parameter.Value,
	}, nil
}
