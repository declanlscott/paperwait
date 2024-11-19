package lifecycle

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

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
	params, err := getStartupParams(ctx)
	if err != nil {
		log.Fatalf("Failed to get startup parameters: %v", err)
	}

	_ = os.Setenv("TSNET_FORCE_LOGIN", "1")
	ts.server = &tsnet.Server{
		Dir:       tsDir,
		Hostname:  hostname,
		AuthKey:   *params.authKey,
		Ephemeral: true,
	}

	log.Println("Starting Tailscale server ...")
	status, err := ts.server.Up(ctx)
	if err != nil {
		log.Fatalf("Failed to start Tailscale server: %v", err)
	}
	ts.nodeID = &status.Self.ID

	proxy := httputil.NewSingleHostReverseProxy(params.target)
	proxy.Transport = ts.server.HTTPClient().Transport

	HandlerAdapter = httpadapter.New(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			proxy.ServeHTTP(w, r)
		}))

	log.Println("Startup completed")
}

type StartupParams struct {
	target  *url.URL
	authKey *string
}

func getStartupParams(ctx context.Context) (*StartupParams, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatalf("Failed to load AWS SDK configuration: %v", err)
	}

	client := ssm.NewFromConfig(cfg)

	const initialWgSize = 2
	var (
		target  *url.URL
		authKey *string

		wg   sync.WaitGroup
		errs = make(chan error, initialWgSize)
	)
	wg.Add(initialWgSize)

	go func() {
		defer wg.Done()

		output, err := client.GetParameter(ctx, &ssm.GetParameterInput{
			Name: aws.String(targetParamName),
		})
		if err != nil {
			errs <- fmt.Errorf("failed to get target parameter: %w", err)
			return
		}

		target, err = url.Parse(*output.Parameter.Value)
	}()

	go func() {
		defer wg.Done()

		output, err := client.GetParameter(ctx, &ssm.GetParameterInput{
			Name:           aws.String(tsOAuthClientParamName),
			WithDecryption: aws.Bool(true),
		})
		if err != nil {
			errs <- fmt.Errorf("failed to get oauth client parameter: %w", err)
			return
		}

		var oAuthClient struct {
			Id  string `json:"id"`
			Key string `json:"key"`
		}
		if err := json.Unmarshal([]byte(*output.Parameter.Value), &oAuthClient); err != nil {
			errs <- fmt.Errorf("failed to unmarshal oauth client parameter: %w", err)
			return
		}

		req, err := http.NewRequest("POST", fmt.Sprintf("%s/api/v2/oauth/token", tsBaseURL), nil)
		if err != nil {
			errs <- fmt.Errorf("failed to create access token request: %w", err)
			return
		}
		req.SetBasicAuth(oAuthClient.Id, oAuthClient.Key)

		res, err := http.DefaultClient.Do(req)
		if err != nil {
			errs <- fmt.Errorf("failed to make access token request: %w", err)
			return
		}
		defer func(Body io.ReadCloser) {
			err := Body.Close()
			if err != nil {
				errs <- fmt.Errorf("failed to close access token response body: %w", err)
			}
		}(res.Body)

		if res.StatusCode != http.StatusOK {
			errs <- fmt.Errorf("failed to get access token response returning ok status, received: %d", res.StatusCode)
			return
		}

		var decoded struct {
			AccessToken string `json:"access_token"`
		}
		if err := json.NewDecoder(res.Body).Decode(&decoded); err != nil {
			errs <- fmt.Errorf("failed to decode access token response: %w", err)
			return
		}

		ts.client = tailscale.NewClient("-", tailscale.APIKey(decoded.AccessToken))
		ts.client.BaseURL = tsBaseURL

		capabilities := tailscale.KeyCapabilities{
			Devices: tailscale.KeyDeviceCapabilities{
				Create: tailscale.KeyDeviceCreateCapabilities{
					Reusable:      false,
					Ephemeral:     true,
					Preauthorized: false,
					Tags:          []string{"tag:printworks"},
				},
			},
		}

		secret, meta, err := ts.client.CreateKeyWithExpiry(ctx, capabilities, 15*time.Minute)
		if err != nil {
			errs <- fmt.Errorf("failed to create auth key: %w", err)
		}

		authKey = &secret
		ts.authKeyID = &meta.ID
	}()

	wg.Wait()
	close(errs)

	for err := range errs {
		if err != nil {
			return nil, err
		}
	}

	if target == nil || &authKey == nil {
		return nil, errors.New("missing startup parameter(s)")
	}

	return &StartupParams{
		target:  target,
		authKey: authKey,
	}, nil
}
