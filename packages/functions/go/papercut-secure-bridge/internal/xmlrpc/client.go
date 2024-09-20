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
		return nil, errors.New("failed to create xml-rpc client")
	}

	return client, nil
}

func Call(
	client *xmlrpc.Client,
	serviceMethod string,
	args any,
	reply any,
) ([]byte, error) {
	err := client.Call(serviceMethod, args, reply)
	if err != nil {
		return nil, err
	}

	data, err := json.Marshal(reply)
	if err != nil {
		return nil, err
	}

	return data, nil
}
