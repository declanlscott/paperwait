package handler

import (
	"fmt"
	"log"
	"net/http"

	"github.com/aws/aws-lambda-go/events"
)

func UnauthorizedResponse(err error) events.APIGatewayProxyResponse {
	log.Printf("Unauthorized Error: %v", err)

	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusUnauthorized,
		Body:       fmt.Sprintf(`{"message":"%s"}`, err.Error()),
	}
}

func InternalServerErrorResponse(err error) events.APIGatewayProxyResponse {
	log.Printf("Internal Server Error: %v", err)

	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusInternalServerError,
		Body:       fmt.Sprintf(`{"message":"%s"}`, err.Error()),
	}
}

func NotImplementedResponse(err error) events.APIGatewayProxyResponse {
	log.Printf("Not Implemented Error: %v", err)

	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusNotImplemented,
		Body:       fmt.Sprintf(`{"message":"%s"}`, err.Error()),
	}
}
