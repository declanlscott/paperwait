package papercut

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"secure-xml-rpc-forward-proxy/internal/aws"
)

type Credentials struct {
	Target    string `json:"target"`
	Port      string `json:"port"`
	AuthToken string `json:"authToken"`
}

func GetCredentials() (*Credentials, error) {
	orgId := os.Getenv("ORG_ID")
	if orgId == "" {
		return nil, errors.New("ORG_ID not set")
	}

	output, err := aws.GetParameter(
		fmt.Sprintf("/paperwait/org/%s/papercut/credentials", orgId),
		true,
	)
	if err != nil {
		return nil, err
	}
	var credentials Credentials
	if err := json.Unmarshal([]byte(*output.Parameter.Value), &credentials); err != nil {
		return nil, err
	}

	return &credentials, nil
}
