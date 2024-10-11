package papercut

import (
	"encoding/json"
	"fmt"
	"net/http"

	"alexejk.io/go-xmlrpc"
)

func Client(httpClient *http.Client, endpoint string) (*xmlrpc.Client, error) {
	client, err := xmlrpc.NewClient(
		endpoint,
		xmlrpc.HttpClient(httpClient),
		xmlrpc.SkipUnknownFields(true),
	)
	if err != nil {
		return nil, err
	}

	return client, nil
}

func Call(
	client *xmlrpc.Client,
	methodName string,
	args any,
	reply any,
) ([]byte, error) {
	if err := client.Call(fmt.Sprintf("%s%s", MethodPrefix, methodName), args, reply); err != nil {
		return nil, err
	}

	if data, err := json.Marshal(reply); err != nil {
		return nil, err
	} else {
		return data, nil
	}
}
