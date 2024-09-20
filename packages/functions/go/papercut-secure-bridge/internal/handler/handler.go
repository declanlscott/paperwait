package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"net/http"
	"os"
	"papercut-secure-bridge/internal/proxy"
	"papercut-secure-bridge/internal/xmlrpc"
	"strings"
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
	if client, err := xmlrpc.Client(httpClient); err != nil {
		return InternalServerErrorResponse(err)
	} else {
		defer client.Close()

		authToken, ok := os.LookupEnv("AUTH_TOKEN")
		if !ok {
			return InternalServerErrorResponse(errors.New("AUTH_TOKEN environment variable is not set"))
		}

		var data []byte
		var err error
		switch method := req.PathParameters["method"]; method {
		case xmlrpc.AdjustSharedAccountAccountBalance:
			var reqBody xmlrpc.AdjustSharedAccountAccountBalanceRequestBody
			if err := json.Unmarshal([]byte(req.Body), &reqBody); err != nil {
				return InternalServerErrorResponse(err)
			}

			data, err = xmlrpc.Call(
				client,
				fmt.Sprintf("%s%s", xmlrpc.MethodPrefix, method),
				&xmlrpc.AdjustSharedAccountAccountBalanceArgs{
					AuthToken:         authToken,
					SharedAccountName: reqBody.SharedAccountName,
					Adjustment:        reqBody.Adjustment,
					Comment:           reqBody.Comment,
				},
				&xmlrpc.AdjustSharedAccountAccountBalanceReply{},
			)
		case xmlrpc.GetSharedAccountProperties:
			var reqBody xmlrpc.GetSharedAccountPropertiesRequestBody
			if err := json.Unmarshal([]byte(req.Body), &reqBody); err != nil {
				return InternalServerErrorResponse(err)
			}

			data, err = xmlrpc.Call(
				client,
				fmt.Sprintf("%s%s", xmlrpc.MethodPrefix, method),
				&xmlrpc.GetSharedAccountPropertiesArgs{
					AuthToken:         authToken,
					SharedAccountName: reqBody.SharedAccountName,
					Properties:        reqBody.Properties,
				},
				&xmlrpc.GetSharedAccountPropertiesReply{},
			)
		case xmlrpc.IsUserExists:
			var reqBody xmlrpc.IsUserExistsRequestBody
			if err := json.Unmarshal([]byte(req.Body), &reqBody); err != nil {
				return InternalServerErrorResponse(err)
			}

			data, err = xmlrpc.Call(
				client,
				fmt.Sprintf("%s%s", xmlrpc.MethodPrefix, method),
				&xmlrpc.IsUserExistsArgs{
					AuthToken: authToken,
					Username:  reqBody.Username,
				},
				&xmlrpc.IsUserExistsReply{},
			)
		case xmlrpc.ListSharedAccounts:
			var reqBody xmlrpc.ListSharedAccountsRequestBody
			if err := json.Unmarshal([]byte(req.Body), &reqBody); err != nil {
				return InternalServerErrorResponse(err)
			}

			data, err = xmlrpc.Call(
				client,
				fmt.Sprintf("%s%s", xmlrpc.MethodPrefix, method),
				&xmlrpc.ListSharedAccountsArgs{
					AuthToken: authToken,
					Offset:    reqBody.Offset,
					Limit:     reqBody.Limit,
				},
				&xmlrpc.ListSharedAccountsReply{},
			)
		case xmlrpc.ListUserSharedAccounts:
			var reqBody xmlrpc.ListUserSharedAccountsRequestBody
			if err := json.Unmarshal([]byte(req.Body), &reqBody); err != nil {
				return InternalServerErrorResponse(err)
			}

			data, err = xmlrpc.Call(
				client,
				fmt.Sprintf("%s%s", xmlrpc.MethodPrefix, method),
				&xmlrpc.ListUserSharedAccountsArgs{
					AuthToken:                        authToken,
					Username:                         reqBody.Username,
					Offset:                           reqBody.Offset,
					Limit:                            reqBody.Limit,
					IgnoreUserAccountSelectionConfig: reqBody.IgnoreUserAccountSelectionConfig,
				},
				&xmlrpc.ListUserSharedAccountsReply{},
			)
		default:
			return NotImplementedResponse(
				errors.New(fmt.Sprintf(`"%s" method not implemented`, method)),
			)
		}
		if err != nil {
			if strings.HasPrefix(err.Error(), xmlrpc.UnauthorizedFaultCode) {
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
