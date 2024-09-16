package aws

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
)

type Parameter struct {
	Value string
}

func GetParameter(name string, withDecryption bool) (*Parameter, error) {
	sessionToken := os.Getenv("AWS_SESSION_TOKEN")
	if sessionToken == "" {
		return nil, errors.New("AWS_SESSION_TOKEN not set")
	}

	parametersSecretsExtensionHttpPort := os.Getenv("PARAMETERS_SECRETS_EXTENSION_HTTP_PORT")
	if parametersSecretsExtensionHttpPort == "" {
		parametersSecretsExtensionHttpPort = "2773"
	}

	params := url.Values{}
	params.Add("name", name)
	params.Add("withDecryption", fmt.Sprintf("%v", withDecryption))
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf(
			"http://localhost:%s/systemsmanager/parameters/get?%s",
			parametersSecretsExtensionHttpPort,
			params.Encode(),
		),
		nil,
	)
	if err != nil {
		return nil, err
	}
	req.Header.Add("X-AWS-Parameters-Secrets-Token", sessionToken)

	// TODO: Finish implementing this function

	return nil, nil
}
