package handler

import (
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"log"
	"net/http"
)

func UnauthorizedResponse(err error) events.APIGatewayV2HTTPResponse {
	log.Printf("%v", err)

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusUnauthorized,
		Body:       fmt.Sprintf("{\"message\": \"%s\"}", err.Error()),
	}
}

func InternalServerErrorResponse(err error) events.APIGatewayV2HTTPResponse {
	log.Printf("%v", err)

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusInternalServerError,
		Body:       fmt.Sprintf("{\"message\": \"%s\"}", err.Error()),
	}
}

func NotImplementedResponse(err error) events.APIGatewayV2HTTPResponse {
	log.Printf("%v", err)

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusNotImplemented,
		Body:       fmt.Sprintf("{\"message\": \"%s\"}", err.Error()),
	}
}
