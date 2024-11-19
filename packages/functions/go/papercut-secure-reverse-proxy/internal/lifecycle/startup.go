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
	"tailscale.com/client/tailscale"
	"tailscale.com/tsnet"
)

func Startup() {
	log.Printf("Starting up ...")

	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGTERM, syscall.SIGINT, syscall.SIGQUIT, syscall.SIGHUP)
	go cleanup(c)

	ctx := context.Background()
	tailscale.I_Acknowledge_This_API_Is_Unstable = true

	log.Println("Getting startup parameters ...")
	params, err := getParams(ctx)
	if err != nil {
		log.Fatalf("Failed to get startup parameters: %v", err)
	}

	_ = os.Setenv("TSNET_FORCE_LOGIN", "1")
	ts.server = &tsnet.Server{
		Dir:       tailscaleDir,
		Hostname:  hostname,
		AuthKey:   *params.authKey,
		Ephemeral: true,
	}

	log.Println("Starting Tailscale server ...")
	status, err := ts.server.Up(ctx)
	if err != nil {
		log.Fatalf("Failed to start Tailscale server: %v", err)
	}
	ts.nodeId = &status.Self.ID
	ts.client = tailscale.NewClient(status.CurrentTailnet.Name, nil)

	proxy := httputil.NewSingleHostReverseProxy(params.target)
	proxy.Transport = ts.server.HTTPClient().Transport

	HandlerAdapter = httpadapter.New(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			proxy.ServeHTTP(w, r)
		}))

	log.Println("Startup completed")
}

type Params struct {
	target  *url.URL
	authKey *string
}

func getParams(ctx context.Context) (*Params, error) {
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

	return &Params{
		target:  target,
		authKey: output.Parameter.Value,
	}, nil
}
