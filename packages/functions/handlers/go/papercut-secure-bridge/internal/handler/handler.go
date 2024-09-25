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

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
)

func Handler(
	ctx context.Context,
	req events.APIGatewayV2HTTPRequest,
) (events.APIGatewayV2HTTPResponse, error) {
	httpClient, err := proxy.HttpClient()
	if err != nil {
		return InternalServerErrorResponse(err), nil
	}

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return InternalServerErrorResponse(err), nil
	}

	ssmClient := ssm.NewFromConfig(cfg)

	return Bridge(ctx, httpClient, ssmClient, req), nil
}

type GetParameterApi interface {
	GetParameter(
		ctx context.Context,
		params *ssm.GetParameterInput,
		optFns ...func(*ssm.Options),
	) (*ssm.GetParameterOutput, error)
}

func GetParameter(
	ctx context.Context,
	api GetParameterApi,
	input *ssm.GetParameterInput,
) (*ssm.GetParameterOutput, error) {
	output, err := api.GetParameter(ctx, input)
	if err != nil {
		return nil, err
	}

	return output, nil
}

func Bridge(
	ctx context.Context,
	httpClient *http.Client,
	getParameterApi GetParameterApi,
	req events.APIGatewayV2HTTPRequest,
) events.APIGatewayV2HTTPResponse {
	orgId, ok := os.LookupEnv("ORG_ID")
	if !ok {
		return InternalServerErrorResponse(errors.New("ORG_ID environment variable is not set"))
	}

	output, err := GetParameter(ctx, getParameterApi, &ssm.GetParameterInput{
		Name: aws.String(
			fmt.Sprintf("/paperwait/org/%s/papercut/web-services/credentials", orgId),
		),
		WithDecryption: aws.Bool(true),
	})
	if err != nil {
		return InternalServerErrorResponse(err)
	}

	var credentials papercut.Credentials
	if err := json.Unmarshal([]byte(*output.Parameter.Value), &credentials); err != nil {
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
