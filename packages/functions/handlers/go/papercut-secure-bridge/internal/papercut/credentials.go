package papercut

import (
	"context"
)

type Credentials struct {
	Endpoint  string `json:"endpoint"`
	AuthToken string `json:"authToken"`
}

type GetCredentialsFunc func(ctx context.Context) (*Credentials, error)
