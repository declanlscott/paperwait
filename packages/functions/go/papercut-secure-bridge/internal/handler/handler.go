package handler

import (
	"context"
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

func Handler(
	_ context.Context,
	req events.APIGatewayV2HTTPRequest,
) (events.APIGatewayV2HTTPResponse, error) {
	httpClient, err := proxy.HttpClient()
	if err != nil {
		return InternalServerErrorResponse(err), nil
	}

	return Bridge(httpClient, req), nil
}

func Bridge(
	httpClient *http.Client,
	req events.APIGatewayV2HTTPRequest,
) events.APIGatewayV2HTTPResponse {
	client, err := xmlrpc.Client(httpClient)
	if err != nil {
		return InternalServerErrorResponse(err)
	}
	defer client.Close()

	authToken, ok := os.LookupEnv("AUTH_TOKEN")
	if !ok {
		return InternalServerErrorResponse(errors.New("AUTH_TOKEN environment variable is not set"))
	}

	method := req.PathParameters["method"]
	var data []byte
	var rpcErr error
	switch method {
	case xmlrpc.AdjustSharedAccountAccountBalance:
		var reqBody xmlrpc.AdjustSharedAccountAccountBalanceRequestBody
		err := json.Unmarshal([]byte(req.Body), &reqBody)
		if err != nil {
			return InternalServerErrorResponse(err)
		}

		data, rpcErr = xmlrpc.Call(
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
		err := json.Unmarshal([]byte(req.Body), &reqBody)
		if err != nil {
			return InternalServerErrorResponse(err)
		}

		data, rpcErr = xmlrpc.Call(
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
		err := json.Unmarshal([]byte(req.Body), &reqBody)
		if err != nil {
			return InternalServerErrorResponse(err)
		}

		data, rpcErr = xmlrpc.Call(
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
		err := json.Unmarshal([]byte(req.Body), &reqBody)
		if err != nil {
			return InternalServerErrorResponse(err)
		}

		data, rpcErr = xmlrpc.Call(
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
		err := json.Unmarshal([]byte(req.Body), &reqBody)
		if err != nil {
			return InternalServerErrorResponse(err)
		}

		data, rpcErr = xmlrpc.Call(
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
	if rpcErr != nil {
		if strings.HasPrefix(rpcErr.Error(), xmlrpc.UnauthorizedFaultCode) {
			return UnauthorizedResponse(errors.New("invalid authentication token"))
		}

		return InternalServerErrorResponse(rpcErr)
	}

	body := string(data)

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusOK,
		Body:       body,
	}
}
