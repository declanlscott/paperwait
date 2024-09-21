package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"papercut-secure-bridge/internal/aws"
	"papercut-secure-bridge/internal/papercut"
	"strings"
	"testing"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/aws/aws-sdk-go-v2/service/ssm/types"
)

type MockServers struct {
	papercut  *httptest.Server
	extension *httptest.Server
}

func mock(res string) (*MockServers, func() error, error) {
	papercutServer := httptest.NewServer(
		http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
			_, _ = fmt.Fprintf(writer, res)
		}),
	)

	extensionServer := httptest.NewServer(
		http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
			credentials, _ := json.Marshal(papercut.Credentials{
				Endpoint:  papercutServer.URL,
				AuthToken: "auth-token",
			})

			value := string(credentials)

			output, _ := json.Marshal(
				ssm.GetParameterOutput{
					Parameter: &types.Parameter{
						Value: &value,
					},
				},
			)

			_, _ = fmt.Fprintf(writer, string(output))
		}),
	)

	segments := strings.Split(extensionServer.URL, ":")
	if err := os.Setenv(
		aws.ExtensionHttpPortEnvVarName,
		segments[len(segments)-1],
	); err != nil {
		return nil, nil, err
	}

	if err := os.Setenv("ORG_ID", "test-org"); err != nil {
		return nil, nil, err
	}

	if err := os.Setenv("AWS_SESSION_TOKEN", "test-token"); err != nil {
		return nil, nil, err
	}

	return &MockServers{papercutServer, extensionServer}, func() error {
		papercutServer.Close()
		extensionServer.Close()

		if err := os.Unsetenv(aws.ExtensionHttpPortEnvVarName); err != nil {
			return err
		}

		if err := os.Unsetenv("ORG_ID"); err != nil {
			return err
		}

		if err := os.Unsetenv("AWS_SESSION_TOKEN"); err != nil {
			return err
		}

		return nil
	}, nil
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

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			servers, cleanup, err := mock(tt.res)
			if err != nil {
				t.Fatal(err)
			}
			defer func() {
				if err := cleanup(); err != nil {
					t.Fatal(err)
				}
			}()

			res := Bridge(servers.papercut.Client(), tt.request)

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
