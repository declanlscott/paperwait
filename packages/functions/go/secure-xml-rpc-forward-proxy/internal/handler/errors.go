package handler

import (
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"log"
	"net/http"
)

func InternalServerErrorResponse(err error, message string) events.APIGatewayV2HTTPResponse {
	log.Printf("%s: %v", message, err)

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusInternalServerError,
		Body:       fmt.Sprintf("{\"message\": \"%s\"}", message),
	}
}
