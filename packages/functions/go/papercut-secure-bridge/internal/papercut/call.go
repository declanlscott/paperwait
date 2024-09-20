package papercut

import (
	"alexejk.io/go-xmlrpc"
	"encoding/json"
)

func Call(
	client *xmlrpc.Client,
	serviceMethod string,
	args any,
	reply any,
) ([]byte, error) {
	err := client.Call(serviceMethod, args, reply)
	if err != nil {
		return nil, err
	}

	data, err := json.Marshal(reply)
	if err != nil {
		return nil, err
	}

	return data, nil
}
