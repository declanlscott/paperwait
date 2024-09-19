package handler

import (
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"log"
	"net/http"
)

func UnauthorizedResponse(message string) events.APIGatewayV2HTTPResponse {
	log.Printf("%s", message)

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusUnauthorized,
		Body:       fmt.Sprintf("{\"message\": \"%s\"}", message),
	}
}

func InternalServerErrorResponse(err error, message string) events.APIGatewayV2HTTPResponse {
	log.Printf("%s: %v", message, err)

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusInternalServerError,
		Body:       fmt.Sprintf("{\"message\": \"%s\"}", message),
	}
}

func NotImplementedResponse(message string) events.APIGatewayV2HTTPResponse {
	log.Printf("%s", message)

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusNotImplemented,
		Body:       fmt.Sprintf("{\"message\": \"%s\"}", message),
	}
}
