package xmlrpc

import (
	"alexejk.io/go-xmlrpc"
	"encoding/json"
	"errors"
	"net/http"
	"os"
)

func Client(httpClient *http.Client) (*xmlrpc.Client, error) {
	endpoint, ok := os.LookupEnv("WEB_SERVICES_ENDPOINT")
	if !ok {
		return nil, errors.New("WEB_SERVICES_ENDPOINT environment variable is not set")
	}

	client, err := xmlrpc.NewClient(
		endpoint,
		xmlrpc.HttpClient(httpClient),
		xmlrpc.SkipUnknownFields(true),
	)
	if err != nil {
		return nil, err
	}

	return client, nil
}

func Call(
	client *xmlrpc.Client,
	serviceMethod string,
	args any,
	reply any,
) ([]byte, error) {
	if err := client.Call(serviceMethod, args, reply); err != nil {
		return nil, err
	}

	if data, err := json.Marshal(reply); err != nil {
		return nil, err
	} else {
		return data, nil
	}
}
