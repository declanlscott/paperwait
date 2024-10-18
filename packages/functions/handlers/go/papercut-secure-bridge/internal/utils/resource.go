package utils

import (
	"encoding/json"
	"log"
	"os"
	"strings"
)

type AppData struct {
	Name  string `json:"name"`
	Stage string `json:"stage"`
}

type Resource struct {
	AppData AppData `json:"AppData"`
}

func GetResource(prefix string) (*Resource, error) {
	env := os.Environ()

	var resource Resource
	for _, kv := range env {
		arr := strings.Split(kv, "=")
		key := arr[0]
		value := arr[1]

		if strings.HasPrefix(key, prefix) && value != "" {
			trimmed := strings.TrimPrefix(key, prefix)

			switch trimmed {
			case "AppData":
				if err := json.Unmarshal([]byte(value), &resource.AppData); err != nil {
					return nil, err
				}
			default:
				log.Printf("Unknown resource key: %s", trimmed)
				continue
			}
		}
	}

	return &resource, nil
}
