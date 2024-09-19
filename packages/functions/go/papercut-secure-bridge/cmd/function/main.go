package main

import (
	"github.com/aws/aws-lambda-go/lambda"
	"papercut-secure-bridge/internal/handler"
)

func main() {
	lambda.Start(handler.Handler)
}
