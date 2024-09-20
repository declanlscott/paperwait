package handler

import (
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func mockServer(res string) (*httptest.Server, func() error, error) {
	server := httptest.NewServer(
		http.HandlerFunc(func(writer http.ResponseWriter, req *http.Request) {
			_, _ = fmt.Fprintf(writer, res)
		}),
	)

	if err := os.Setenv("WEB_SERVICES_ENDPOINT", server.URL); err != nil {
		return nil, nil, err
	}
	if err := os.Setenv("AUTH_TOKEN", "auth-token"); err != nil {
		return nil, nil, err
	}

	return server, func() error {
		server.Close()
		if err := os.Unsetenv("WEB_SERVICES_ENDPOINT"); err != nil {
			return err
		}
		if err := os.Unsetenv("AUTH_TOKEN"); err != nil {
			return err
		}

		return nil
	}, nil
}

func TestBridge(t *testing.T) {
	// TODO: Add more tests
	tests := []struct {
		name         string
		request      events.APIGatewayV2HTTPRequest
		mockResponse string
		expected     events.APIGatewayV2HTTPResponse
	}{
		{
			"isUserExists",
			events.APIGatewayV2HTTPRequest{
				PathParameters: map[string]string{"method": "isUserExists"},
				Body:           `{"username":"test"}`,
			},
			`<?xml version="1.0"?>
			<methodResponse>
				<params>
					<param>
						<value>
							<boolean>1</boolean>
						</value>
					</param>
				</params>
			</methodResponse>`,
			events.APIGatewayV2HTTPResponse{
				StatusCode: http.StatusOK,
				Body:       `{"exists":true}`,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server, cleanup, err := mockServer(tt.mockResponse)
			if err != nil {
				t.Fatal(err)
			}
			defer func() {
				if err := cleanup(); err != nil {
					t.Fatal(err)
				}
			}()

			res := Bridge(server.Client(), tt.request)

			if res.StatusCode != tt.expected.StatusCode {
				t.Errorf(
					`expected status code "%d", got "%d"`,
					tt.expected.StatusCode,
					res.StatusCode,
				)
			}

			if res.Body != tt.expected.Body {
				t.Errorf(
					`expected body "%s", got "%s"`,
					tt.expected.Body,
					res.Body,
				)
			}
		})
	}
}
