package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	orderedMap "github.com/wk8/go-ordered-map/v2"
	"net/http"
	"secure-xml-rpc-forward-proxy/internal/papercut"
	"secure-xml-rpc-forward-proxy/internal/xmlrpc"
)

func Handler(_ context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	credentials, err := papercut.GetCredentials()
	if err != nil {
		return InternalServerErrorResponse(err, "failed to get papercut credentials"), nil
	}

	client, err := xmlrpc.Client(credentials)
	if err != nil {
		return InternalServerErrorResponse(err, "failed to create xml-rpc client"), nil
	}
	defer client.Close()

	args := orderedMap.New[string, any]()
	args.Set("authToken", credentials.AuthToken)
	err = json.Unmarshal([]byte(req.Body), &args)
	if err != nil {
		return InternalServerErrorResponse(err, "failed to unmarshal request body"), nil
	}

	var reply map[string]interface{}
	err = client.Call(
		fmt.Sprintf("api.%s", req.PathParameters["serviceMethod"]),
		args,
		&reply,
	)
	if err != nil {
		return InternalServerErrorResponse(err, "failed to call xml-rpc method"), nil
	}

	body, err := json.Marshal(reply)
	if err != nil {
		return InternalServerErrorResponse(err, "failed to marshal response body"), nil
	}

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusOK,
		Body:       string(body),
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
	}, nil
}
