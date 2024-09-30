package handler

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"papercut-secure-bridge/internal/papercut"
	"testing"

	"github.com/aws/aws-lambda-go/events"
)

func mockPapercut(res string) (*httptest.Server, papercut.GetCredentialsFunc, func()) {
	server := httptest.NewServer(
		http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
			_, _ = fmt.Fprintf(writer, res)
		}),
	)

	return server, func(context.Context, string) (*papercut.Credentials, error) {
		return &papercut.Credentials{
			Endpoint:  server.URL,
			AuthToken: "auth-token",
		}, nil
	}, server.Close
}

func TestBridge(t *testing.T) {
	tests := []struct {
		name     string
		request  events.APIGatewayV2HTTPRequest
		res      string
		expected events.APIGatewayV2HTTPResponse
	}{
		{
			"adjustSharedAccountAccountBalance",
			events.APIGatewayV2HTTPRequest{
				PathParameters: map[string]string{"method": "adjustSharedAccountAccountBalance"},
				Body:           `{"sharedAccountName":"test account","adjustment":1.0,"comment":"test comment"}`,
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
				Body:       `{"success":true}`,
			},
		},
		{
			"getSharedAccountProperties",
			events.APIGatewayV2HTTPRequest{
				PathParameters: map[string]string{"method": "getSharedAccountProperties"},
				Body:           `{"sharedAccountName":"test account","properties":["test property"]}`,
			},
			`<?xml version="1.0"?>
			<methodResponse>
				<params>
					<param>
						<value>
							<array>
								<data>
									<value>property</value>
								</data>
							</array>
						</value>
					</param>
				</params>
			</methodResponse>`,
			events.APIGatewayV2HTTPResponse{
				StatusCode: http.StatusOK,
				Body:       `{"properties":["property"]}`,
			},
		},
		{
			"isUserExists",
			events.APIGatewayV2HTTPRequest{
				PathParameters: map[string]string{"method": "isUserExists"},
				Body:           `{"username":"test username"}`,
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
		{
			"listSharedAccounts",
			events.APIGatewayV2HTTPRequest{
				PathParameters: map[string]string{"method": "listSharedAccounts"},
				Body:           `{"offset":0,"limit":1000}`,
			},
			`<?xml version="1.0"?>
			<methodResponse>
				<params>
					<param>
						<value>
							<array>
								<data>
									<value>account 1</value>
									<value>account 2</value>
									<value>account 3</value>
								</data>
							</array>
						</value>
					</param>
				</params>
			</methodResponse>`,
			events.APIGatewayV2HTTPResponse{
				StatusCode: http.StatusOK,
				Body:       `{"sharedAccounts":["account 1","account 2","account 3"]}`,
			},
		},
		{
			"listUserSharedAccounts",
			events.APIGatewayV2HTTPRequest{
				PathParameters: map[string]string{"method": "listUserSharedAccounts"},
				Body: `{
					"username":"test username",
					"offset":0,
					"limit":1000,
					"ignoreUserAccountSelectionConfig":true
				}`,
			},
			`<?xml version="1.0"?>
			<methodResponse>
				<params>
					<param>
						<value>
							<array>
								<data>
									<value>account 1</value>
									<value>account 2</value>
								</data>
							</array>
						</value>
					</param>
				</params>
			</methodResponse>`,
			events.APIGatewayV2HTTPResponse{
				StatusCode: http.StatusOK,
				Body:       `{"userSharedAccounts":["account 1","account 2"]}`,
			},
		},
		{
			"notImplemented",
			events.APIGatewayV2HTTPRequest{
				PathParameters: map[string]string{"method": "notImplemented"},
			},
			"",
			events.APIGatewayV2HTTPResponse{
				StatusCode: http.StatusNotImplemented,
				Body:       `{"message":""notImplemented" method not implemented"}`,
			},
		},
		{
			"invalidAuth",
			events.APIGatewayV2HTTPRequest{
				PathParameters: map[string]string{"method": "isUserExists"},
				Body:           `{"username":"test username"}`,
			},
			`<?xml version="1.0"?>
			<methodResponse>
				<fault>
					<value>
						<struct>
							<member>
								<name>faultString</name>
								<value>java.lang.Exception: Invalid authentication token supplied</value>
							</member>
							<member>
								<name>faultCode</name>
								<value>
									<int>319</int>
								</value>
							</member>
						</struct>
					</value>
				</fault>
			</methodResponse>`,
			events.APIGatewayV2HTTPResponse{
				StatusCode: http.StatusUnauthorized,
				Body:       `{"message":"invalid authentication token"}`,
			},
		},
		{
			"invalidArgs",
			events.APIGatewayV2HTTPRequest{
				PathParameters: map[string]string{"method": "isUserExists"},
				Body:           `{"args":"invalid"}`,
			},
			"",
			events.APIGatewayV2HTTPResponse{
				StatusCode: http.StatusInternalServerError,
				Body:       `{"message":"EOF"}`,
			},
		},
		{
			"invalidJson",
			events.APIGatewayV2HTTPRequest{
				PathParameters: map[string]string{"method": "isUserExists"},
				Body:           "invalid json",
			},
			"",
			events.APIGatewayV2HTTPResponse{
				StatusCode: http.StatusInternalServerError,
				Body:       `{"message":"invalid character 'i' looking for beginning of value"}`,
			},
		},
	}

	if err := os.Setenv("ORG_ID", "test-org"); err != nil {
		t.Fatal(err)
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server, getCredentials, cleanup := mockPapercut(tt.res)
			defer cleanup()

			res := Bridge(
				context.TODO(),
				tt.request,
				server.Client(),
				getCredentials,
			)

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
