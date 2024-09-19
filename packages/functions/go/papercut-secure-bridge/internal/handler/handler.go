package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"net/http"
	"os"
	"papercut-secure-bridge/internal/xmlrpc"
	"strings"
)

func Handler(
	_ context.Context,
	req events.APIGatewayV2HTTPRequest,
) (events.APIGatewayV2HTTPResponse, error) {
	client, err := xmlrpc.Client()
	if err != nil {
		return InternalServerErrorResponse(err, "failed to create xml-rpc client"), nil
	}
	defer client.Close()

	authToken := os.Getenv("AUTH_TOKEN")
	if authToken == "" {
		message := "AUTH_TOKEN environment variable is not set"
		return InternalServerErrorResponse(errors.New(message), message), nil
	}

	method := req.PathParameters["method"]
	var data []byte
	var rpcErr error
	switch method {
	case xmlrpc.AdjustSharedAccountAccountBalance:
		var reqBody xmlrpc.AdjustSharedAccountAccountBalanceRequestBody
		err := json.Unmarshal([]byte(req.Body), &reqBody)
		if err != nil {
			return InternalServerErrorResponse(
				err,
				fmt.Sprintf("failed to unmarhsal \"%s\" request body", method),
			), nil
		}

		data, rpcErr = xmlrpc.Call(
			client,
			fmt.Sprintf("api.%s", method),
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
			return InternalServerErrorResponse(
				err,
				fmt.Sprintf("failed to unmarhsal \"%s\" request body", method),
			), nil
		}

		data, rpcErr = xmlrpc.Call(
			client,
			fmt.Sprintf("api.%s", method),
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
			return InternalServerErrorResponse(
				err,
				fmt.Sprintf("failed to unmarhsal \"%s\" request body", method),
			), nil
		}

		data, rpcErr = xmlrpc.Call(
			client,
			fmt.Sprintf("api.%s", method),
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
			return InternalServerErrorResponse(
				err,
				fmt.Sprintf("failed to unmarhsal \"%s\" request body", method),
			), nil
		}

		data, rpcErr = xmlrpc.Call(
			client,
			fmt.Sprintf("api.%s", method),
			&xmlrpc.ListSharedAccountsArgs{
				AuthToken: authToken,
				Offset:    reqBody.Offset,
				Limit:     reqBody.Limit,
			},
			&xmlrpc.ListSharedAccountsReply{},
		)
	default:
		return NotImplementedResponse(
			fmt.Sprintf("\"%s\" method not implemented", method),
		), nil
	}
	if rpcErr != nil {
		if strings.HasPrefix(rpcErr.Error(), xmlrpc.UnauthorizedFaultCode) {
			return UnauthorizedResponse("Invalid authentication token"), nil
		}

		return InternalServerErrorResponse(
			rpcErr,
			fmt.Sprintf("\"%s\" method call failed", method),
		), nil
	}

	body := string(data)

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusOK,
		Body:       body,
	}, nil
}
