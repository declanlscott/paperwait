package handler

import (
	"alexejk.io/go-xmlrpc"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"net/http"
	"os"
	"papercut-secure-bridge/internal/papercut"
	"papercut-secure-bridge/internal/socks5"
	"strings"
)

func Handler(
	_ context.Context,
	req events.APIGatewayV2HTTPRequest,
) (events.APIGatewayV2HTTPResponse, error) {
	c, err := socks5.HttpClient()
	if err != nil {
		return InternalServerErrorResponse(err, "failed to create proxy http client"), nil
	}

	return Bridge(c, req), nil
}

func Bridge(
	c *http.Client,
	req events.APIGatewayV2HTTPRequest,
) events.APIGatewayV2HTTPResponse {
	endpoint := os.Getenv("WEB_SERVICES_ENDPOINT")
	if endpoint == "" {
		message := "WEB_SERVICES_ENDPOINT environment variable is not set"
		return InternalServerErrorResponse(errors.New(message), message)
	}

	client, err := xmlrpc.NewClient(
		endpoint,
		xmlrpc.HttpClient(c),
		xmlrpc.SkipUnknownFields(true),
	)
	if err != nil {
		return InternalServerErrorResponse(err, "failed to create xml-rpc client")
	}
	defer client.Close()

	authToken := os.Getenv("AUTH_TOKEN")
	if authToken == "" {
		message := "AUTH_TOKEN environment variable is not set"
		return InternalServerErrorResponse(errors.New(message), message)
	}

	method := req.PathParameters["method"]
	var data []byte
	var rpcErr error
	switch method {
	case papercut.AdjustSharedAccountAccountBalance:
		var reqBody papercut.AdjustSharedAccountAccountBalanceRequestBody
		err := json.Unmarshal([]byte(req.Body), &reqBody)
		if err != nil {
			return InternalServerErrorResponse(
				err,
				fmt.Sprintf(`failed to unmarhsal "%s" request body`, method),
			)
		}

		data, rpcErr = papercut.Call(
			client,
			fmt.Sprintf("api.%s", method),
			&papercut.AdjustSharedAccountAccountBalanceArgs{
				AuthToken:         authToken,
				SharedAccountName: reqBody.SharedAccountName,
				Adjustment:        reqBody.Adjustment,
				Comment:           reqBody.Comment,
			},
			&papercut.AdjustSharedAccountAccountBalanceReply{},
		)
	case papercut.GetSharedAccountProperties:
		var reqBody papercut.GetSharedAccountPropertiesRequestBody
		err := json.Unmarshal([]byte(req.Body), &reqBody)
		if err != nil {
			return InternalServerErrorResponse(
				err,
				fmt.Sprintf(`failed to unmarhsal "%s" request body`, method),
			)
		}

		data, rpcErr = papercut.Call(
			client,
			fmt.Sprintf("api.%s", method),
			&papercut.GetSharedAccountPropertiesArgs{
				AuthToken:         authToken,
				SharedAccountName: reqBody.SharedAccountName,
				Properties:        reqBody.Properties,
			},
			&papercut.GetSharedAccountPropertiesReply{},
		)
	case papercut.IsUserExists:
		var reqBody papercut.IsUserExistsRequestBody
		err := json.Unmarshal([]byte(req.Body), &reqBody)
		if err != nil {
			return InternalServerErrorResponse(
				err,
				fmt.Sprintf(`failed to unmarhsal "%s" request body`, method),
			)
		}

		data, rpcErr = papercut.Call(
			client,
			fmt.Sprintf("api.%s", method),
			&papercut.IsUserExistsArgs{
				AuthToken: authToken,
				Username:  reqBody.Username,
			},
			&papercut.IsUserExistsReply{},
		)
	case papercut.ListSharedAccounts:
		var reqBody papercut.ListSharedAccountsRequestBody
		err := json.Unmarshal([]byte(req.Body), &reqBody)
		if err != nil {
			return InternalServerErrorResponse(
				err,
				fmt.Sprintf(`failed to unmarhsal "%s" request body`, method),
			)
		}

		data, rpcErr = papercut.Call(
			client,
			fmt.Sprintf("api.%s", method),
			&papercut.ListSharedAccountsArgs{
				AuthToken: authToken,
				Offset:    reqBody.Offset,
				Limit:     reqBody.Limit,
			},
			&papercut.ListSharedAccountsReply{},
		)
	case papercut.ListUserSharedAccounts:
		var reqBody papercut.ListUserSharedAccountsRequestBody
		err := json.Unmarshal([]byte(req.Body), &reqBody)
		if err != nil {
			return InternalServerErrorResponse(
				err,
				fmt.Sprintf(`failed to unmarhsal "%s" request body`, method),
			)
		}

		data, rpcErr = papercut.Call(
			client,
			fmt.Sprintf("api.%s", method),
			&papercut.ListUserSharedAccountsArgs{
				AuthToken:                        authToken,
				Username:                         reqBody.Username,
				Offset:                           reqBody.Offset,
				Limit:                            reqBody.Limit,
				IgnoreUserAccountSelectionConfig: reqBody.IgnoreUserAccountSelectionConfig,
			},
			&papercut.ListUserSharedAccountsReply{},
		)
	default:
		return NotImplementedResponse(
			fmt.Sprintf(`"%s" method not implemented`, method),
		)
	}
	if rpcErr != nil {
		if strings.HasPrefix(rpcErr.Error(), papercut.UnauthorizedFaultCode) {
			return UnauthorizedResponse("Invalid authentication token")
		}

		return InternalServerErrorResponse(
			rpcErr,
			fmt.Sprintf(`"%s" method call failed`, method),
		)
	}

	body := string(data)

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusOK,
		Body:       body,
	}
}
