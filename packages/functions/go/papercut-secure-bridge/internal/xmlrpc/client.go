package xmlrpc

import (
	"alexejk.io/go-xmlrpc"
	"encoding/json"
	"errors"
	"os"
	"papercut-secure-bridge/internal/socks5"
)

func Client() (*xmlrpc.Client, error) {
	endpoint := os.Getenv("WEB_SERVICES_ENDPOINT")
	if endpoint == "" {
		return nil, errors.New("WEB_SERVICES_ENDPOINT environment variable is not set")
	}

	httpClient, err := socks5.HttpClient()
	if err != nil {
		return nil, err
	}

	client, err := xmlrpc.NewClient(endpoint, xmlrpc.HttpClient(httpClient))
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
