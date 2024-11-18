package main

import (
	"papercut-secure-reverse-proxy/internal/handler"
	"papercut-secure-reverse-proxy/internal/lifecycle"

	"github.com/aws/aws-lambda-go/lambda"
)

func init() {
	lifecycle.Startup()
}

func main() {
	lambda.Start(handler.Handler)
}
