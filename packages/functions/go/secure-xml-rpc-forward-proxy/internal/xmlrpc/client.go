package xmlrpc

import (
	"alexejk.io/go-xmlrpc"
	"fmt"
	"secure-xml-rpc-forward-proxy/internal/papercut"
	"secure-xml-rpc-forward-proxy/internal/socks5"
)

func Client(credentials *papercut.Credentials) (*xmlrpc.Client, error) {
	httpClient, err := socks5.HttpClient()
	if err != nil {
		return nil, err
	}

	client, err := xmlrpc.NewClient(
		fmt.Sprintf("%s:%s/rpc/api/xmlrpc", credentials.Target, credentials.Port),
		xmlrpc.HttpClient(httpClient),
	)
	if err != nil {
		return nil, err
	}

	return client, nil
}
