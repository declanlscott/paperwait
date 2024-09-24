package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"papercut-secure-bridge/internal/aws"
	"papercut-secure-bridge/internal/papercut"
	"papercut-secure-bridge/internal/proxy"
	"strings"

	"github.com/aws/aws-lambda-go/events"
)

func Handler(req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	if httpClient, err := proxy.HttpClient(); err != nil {
		return InternalServerErrorResponse(err), nil
	} else {
		return Bridge(httpClient, req), nil
	}
}

func Bridge(
	httpClient *http.Client,
	req events.APIGatewayV2HTTPRequest,
) events.APIGatewayV2HTTPResponse {
	orgId, ok := os.LookupEnv("ORG_ID")
	if !ok {
		return InternalServerErrorResponse(errors.New("ORG_ID environment variable is not set"))
	}

	output, err := aws.GetParameter(
		fmt.Sprintf("/paperwait/org/%s/papercut/web-services/credentials", orgId),
		true,
	)
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
