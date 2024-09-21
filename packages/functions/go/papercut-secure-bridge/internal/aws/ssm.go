package aws

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"

	"github.com/aws/aws-sdk-go-v2/service/ssm"
)

const (
	ExtensionHttpPortEnvVarName = "PARAMETERS_SECRETS_EXTENSION_HTTP_PORT"
)

func GetParameter(name string, withDecryption bool) (*ssm.GetParameterOutput, error) {
	sessionToken, ok := os.LookupEnv("AWS_SESSION_TOKEN")
	if !ok {
		return nil, errors.New("AWS_SESSION_TOKEN environment variable not set")
	}

	port, ok := os.LookupEnv(ExtensionHttpPortEnvVarName)
	if !ok {
		port = "2773"
	}

	params := url.Values{}
	params.Add("name", name)
	params.Add("withDecryption", fmt.Sprintf("%v", withDecryption))
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf(
			"http://127.0.0.1:%s/systemsmanager/parameters/get?%s",
			port,
			params.Encode(),
		),
		nil,
	)
	if err != nil {
		return nil, err
	}
	req.Header.Add("X-Aws-Parameters-Secrets-Token", sessionToken)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected ssm status code: %d", res.StatusCode)
	}

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
