package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
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
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
	if httpClient, err := proxy.HttpClient(); err != nil {
		return InternalServerErrorResponse(err), nil
	} else {
		return Bridge(
			ctx,
			req,
			httpClient,
			func(
				ctx context.Context,
			) (*papercut.Credentials, error) {
				once.Do(func() {
					cfg, err := config.LoadDefaultConfig(ctx)
					if err != nil {
						credentials.err = err
						return
					}

					client := ssm.NewFromConfig(cfg)

					output, err := client.GetParameter(ctx, &ssm.GetParameterInput{
						Name:           aws.String("/paperwait/papercut/web-services/credentials"),
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
	req events.APIGatewayProxyRequest,
	httpClient *http.Client,
	getCredentials papercut.GetCredentialsFunc,
) events.APIGatewayProxyResponse {
	credentials, err := getCredentials(ctx)
	if err != nil {
		return InternalServerErrorResponse(err)
	}

	if client, err := papercut.Client(httpClient, credentials.Endpoint); err != nil {
		return InternalServerErrorResponse(err)
	} else {
		defer client.Close()

		var data []byte
		var err error
		switch methodName := strings.Split(req.Path, "/papercut/secure-bridge/")[1]; methodName {
		case papercut.AdjustSharedAccountAccountBalance:
			var reqBody papercut.AdjustSharedAccountAccountBalanceRequestBody
			if err := json.Unmarshal([]byte(req.Body), &reqBody); err != nil {
				return InternalServerErrorResponse(err)
			}

			data, err = papercut.Call(
				client,
				methodName,
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
				methodName,
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
				methodName,
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
				methodName,
				&papercut.ListSharedAccountsArgs{
					AuthToken: credentials.AuthToken,
					Offset:    reqBody.Offset,
					Limit:     reqBody.Limit,
				},
				&papercut.ListSharedAccountsReply{},
			)
		case papercut.ListUserAccounts:
			var reqBody papercut.ListUserAccountsRequestBody
			if err := json.Unmarshal([]byte(req.Body), &reqBody); err != nil {
				return InternalServerErrorResponse(err)
			}

			data, err = papercut.Call(
				client,
				methodName,
				&papercut.ListUserAccountsArgs{
					AuthToken: credentials.AuthToken,
					Username:  reqBody.Username,
					Offset:    reqBody.Offset,
					Limit:     reqBody.Limit,
				},
				&papercut.ListUserAccountsReply{},
			)
		case papercut.ListUserSharedAccounts:
			var reqBody papercut.ListUserSharedAccountsRequestBody
			if err := json.Unmarshal([]byte(req.Body), &reqBody); err != nil {
				return InternalServerErrorResponse(err)
			}

			data, err = papercut.Call(
				client,
				methodName,
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
				errors.New(fmt.Sprintf(`"%s" method not implemented`, methodName)),
			)
		}
		if err != nil {
			if strings.HasPrefix(err.Error(), papercut.UnauthorizedFaultCode) {
				return UnauthorizedResponse(errors.New("invalid authentication token"))
			}

			return InternalServerErrorResponse(err)
		}

		body := string(data)

		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusOK,
			Body:       body,
		}
	}
}
