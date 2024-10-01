package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"papercut-secure-bridge/internal/papercut"
	"papercut-secure-bridge/internal/proxy"
	"strings"
	"sync"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
)

var (
	credentials struct {
		value *papercut.Credentials
		err   error
	}
	once sync.Once
)

func Handler(
	ctx context.Context,
	req events.APIGatewayV2HTTPRequest,
) (events.APIGatewayV2HTTPResponse, error) {
	if httpClient, err := proxy.HttpClient(); err != nil {
		return InternalServerErrorResponse(err), nil
	} else {
		return Bridge(
			ctx,
			req,
			httpClient,
			func(
				ctx context.Context,
				tenantId string,
			) (*papercut.Credentials, error) {
				once.Do(func() {
					cfg, err := config.LoadDefaultConfig(ctx)
					if err != nil {
						credentials.err = err
						return
					}

					client := ssm.NewFromConfig(cfg)

					output, err := client.GetParameter(ctx, &ssm.GetParameterInput{
						Name: aws.String(
							fmt.Sprintf("/paperwait/tenant/%s/papercut/web-services/credentials", tenantId),
						),
						WithDecryption: aws.Bool(true),
					})
					if err != nil {
						credentials.err = err
						return
					}

					err = json.Unmarshal([]byte(*output.Parameter.Value), &credentials.value)
					if err != nil {
						credentials.err = err
						return
					}
				})

				return credentials.value, credentials.err
			},
		), nil
	}
}

func Bridge(
	ctx context.Context,
	req events.APIGatewayV2HTTPRequest,
	httpClient *http.Client,
	getCredentials papercut.GetCredentialsFunc,
) events.APIGatewayV2HTTPResponse {
	tenantId, ok := os.LookupEnv("TENANT_ID")
	if !ok {
		return InternalServerErrorResponse(errors.New("TENANT_ID environment variable is not set"))
	}

	credentials, err := getCredentials(ctx, tenantId)
	if err != nil {
		return InternalServerErrorResponse(err)
	}

	if client, err := papercut.Client(httpClient, credentials.Endpoint); err != nil {
		return InternalServerErrorResponse(err)
	} else {
		defer client.Close()

		var data []byte
		var err error
		switch method := req.PathParameters["method"]; method {
		case papercut.AdjustSharedAccountAccountBalance:
			var reqBody papercut.AdjustSharedAccountAccountBalanceRequestBody
			if err := json.Unmarshal([]byte(req.Body), &reqBody); err != nil {
				return InternalServerErrorResponse(err)
			}

			data, err = papercut.Call(
				client,
				fmt.Sprintf("%s%s", papercut.MethodPrefix, method),
				&papercut.AdjustSharedAccountAccountBalanceArgs{
					AuthToken:         credentials.AuthToken,
					SharedAccountName: reqBody.SharedAccountName,
					Adjustment:        reqBody.Adjustment,
					Comment:           reqBody.Comment,
				},
				&papercut.AdjustSharedAccountAccountBalanceReply{},
			)
		case papercut.GetSharedAccountProperties:
			var reqBody papercut.GetSharedAccountPropertiesRequestBody
			if err := json.Unmarshal([]byte(req.Body), &reqBody); err != nil {
				return InternalServerErrorResponse(err)
			}

			data, err = papercut.Call(
				client,
				fmt.Sprintf("%s%s", papercut.MethodPrefix, method),
				&papercut.GetSharedAccountPropertiesArgs{
					AuthToken:         credentials.AuthToken,
					SharedAccountName: reqBody.SharedAccountName,
					Properties:        reqBody.Properties,
				},
				&papercut.GetSharedAccountPropertiesReply{},
			)
		case papercut.IsUserExists:
			var reqBody papercut.IsUserExistsRequestBody
			if err := json.Unmarshal([]byte(req.Body), &reqBody); err != nil {
				return InternalServerErrorResponse(err)
			}

			data, err = papercut.Call(
				client,
				fmt.Sprintf("%s%s", papercut.MethodPrefix, method),
				&papercut.IsUserExistsArgs{
					AuthToken: credentials.AuthToken,
					Username:  reqBody.Username,
				},
				&papercut.IsUserExistsReply{},
			)
		case papercut.ListSharedAccounts:
			var reqBody papercut.ListSharedAccountsRequestBody
			if err := json.Unmarshal([]byte(req.Body), &reqBody); err != nil {
				return InternalServerErrorResponse(err)
			}

			data, err = papercut.Call(
				client,
				fmt.Sprintf("%s%s", papercut.MethodPrefix, method),
				&papercut.ListSharedAccountsArgs{
					AuthToken: credentials.AuthToken,
					Offset:    reqBody.Offset,
					Limit:     reqBody.Limit,
				},
				&papercut.ListSharedAccountsReply{},
			)
		case papercut.ListUserSharedAccounts:
			var reqBody papercut.ListUserSharedAccountsRequestBody
			if err := json.Unmarshal([]byte(req.Body), &reqBody); err != nil {
				return InternalServerErrorResponse(err)
			}

			data, err = papercut.Call(
				client,
				fmt.Sprintf("%s%s", papercut.MethodPrefix, method),
				&papercut.ListUserSharedAccountsArgs{
					AuthToken:                        credentials.AuthToken,
					Username:                         reqBody.Username,
					Offset:                           reqBody.Offset,
					Limit:                            reqBody.Limit,
					IgnoreUserAccountSelectionConfig: reqBody.IgnoreUserAccountSelectionConfig,
				},
				&papercut.ListUserSharedAccountsReply{},
			)
		default:
			return NotImplementedResponse(
				errors.New(fmt.Sprintf(`"%s" method not implemented`, method)),
			)
		}
		if err != nil {
			if strings.HasPrefix(err.Error(), papercut.UnauthorizedFaultCode) {
				return UnauthorizedResponse(errors.New("invalid authentication token"))
			}

			return InternalServerErrorResponse(err)
		}

		body := string(data)

		return events.APIGatewayV2HTTPResponse{
			StatusCode: http.StatusOK,
			Body:       body,
		}
	}
}
