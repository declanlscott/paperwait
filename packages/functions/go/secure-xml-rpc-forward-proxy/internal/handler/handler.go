package handler

import (
	"alexejk.io/go-xmlrpc"
	"context"
	"encoding/json"
	"github.com/aws/aws-lambda-go/events"
	"log"
	"net/http"
	"secure-xml-rpc-forward-proxy/internal/socks5"
)

func Handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) events.APIGatewayV2HTTPResponse {
	proxyHttpClient, err := socks5.HttpClient()
	if err != nil {
		log.Printf("Error creating proxy http client: %v", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       "Internal server error",
		}
	}

	xmlrpcClient, err := xmlrpc.NewClient("/rpc/api/xmlrpc", xmlrpc.HttpClient(proxyHttpClient))
	if err != nil {
		log.Printf("Error creating xml-rpc client: %v", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       "Internal server error",
		}
	}
	defer xmlrpcClient.Close()

	// TODO: get papercut auth token from ssm and add it to the args

	var args map[string]interface{}
	err = json.Unmarshal([]byte(req.Body), &args)
	if err != nil {
		log.Printf("Error unmarshalling request body: %v", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: http.StatusBadRequest,
			Body:       "Bad request",
		}
	}

	// TODO: get service method
	var reply map[string]interface{}
	err = xmlrpcClient.Call("", args, &reply)
	if err != nil {
		log.Printf("Error calling xml-rpc client: %v", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       "Internal server error",
		}
	}

	resBody, err := json.Marshal(reply)
	if err != nil {
		log.Printf("Error marshalling response body: %v", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       "Internal server error",
		}
	}

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusOK,
		Body:       string(resBody),
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
	}
}
