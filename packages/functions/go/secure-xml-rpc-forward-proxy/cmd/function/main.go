package main

import (
	"github.com/aws/aws-lambda-go/lambda"
	"secure-xml-rpc-forward-proxy/internal/handler"
)

func main() {
	lambda.Start(handler.Handler)
}
