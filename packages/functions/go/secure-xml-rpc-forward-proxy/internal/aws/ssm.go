package aws

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"io"
	"net/http"
	"net/url"
	"os"
)

func GetParameter(name string, withDecryption bool) (*ssm.GetParameterOutput, error) {
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

	client := &http.Client{}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	var output ssm.GetParameterOutput
	if err := json.Unmarshal(body, &output); err != nil {
		return nil, err
	}

	return &output, nil
}
