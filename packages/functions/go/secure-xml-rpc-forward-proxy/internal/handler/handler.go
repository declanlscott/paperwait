package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	orderedmap "github.com/wk8/go-ordered-map/v2"
	"net/http"
	"secure-xml-rpc-forward-proxy/internal/papercut"
	"secure-xml-rpc-forward-proxy/internal/xmlrpc"
)

type PapercutCredentials struct {
	Target    string `json:"target"`
	Port      string `json:"port"`
	AuthToken string `json:"authToken"`
}

func Handler(_ context.Context, req events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	credentials, err := papercut.GetCredentials()
	if err != nil {
		return InternalServerErrorResponse(err, "failed to get papercut credentials")
	}

	client, err := xmlrpc.Client(credentials)
	if err != nil {
		return InternalServerErrorResponse(err, "failed to create xml-rpc client")
	}
	defer client.Close()

	args := orderedmap.New[string, string]()
	args.Set("authToken", credentials.AuthToken)
	err = json.Unmarshal([]byte(req.Body), &args)
	if err != nil {
		return InternalServerErrorResponse(err, "failed to unmarshal request body")
	}

	var reply map[string]interface{}
	err = client.Call(
		fmt.Sprintf("api.%s", req.PathParameters["serviceMethod"]),
		args,
		&reply,
	)
	if err != nil {
		return InternalServerErrorResponse(err, "failed to call xml-rpc method")
	}

	body, err := json.Marshal(reply)
	if err != nil {
		return InternalServerErrorResponse(err, "failed to marshal response body")
	}

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusOK,
		Body:       string(body),
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
	}
}
