package proxy

import (
	"context"
	"golang.org/x/net/proxy"
	"net"
	"net/http"
)

func HttpClient() (*http.Client, error) {
	dialer, err := proxy.SOCKS5("tcp", "localhost:1055", nil, proxy.Direct)
	if err != nil {
		return nil, err
	}

	transport := &http.Transport{
		DialContext: func(ctx context.Context, network string, addr string) (net.Conn, error) {
			return dialer.Dial(network, addr)
		},
	}

	client := &http.Client{
		Transport: transport,
	}

	return client, nil
}
