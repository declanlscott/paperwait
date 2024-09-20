package proxy

import (
	"context"
	"golang.org/x/net/proxy"
	"net"
	"net/http"
)

func HttpClient() (*http.Client, error) {
	if dialer, err := proxy.SOCKS5("tcp", "localhost:1055", nil, proxy.Direct); err != nil {
		return nil, err
	} else {
		return &http.Client{
			Transport: &http.Transport{
				DialContext: func(ctx context.Context, network string, addr string) (net.Conn, error) {
					return dialer.Dial(network, addr)
				},
			},
		}, nil
	}
}
