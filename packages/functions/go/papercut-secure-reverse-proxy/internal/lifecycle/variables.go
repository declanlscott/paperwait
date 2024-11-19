package lifecycle

import (
	"sync"
	"time"

	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"tailscale.com/client/tailscale"
	"tailscale.com/tailcfg"
	"tailscale.com/tsnet"
)

const (
	hostname               = "printworks"
	targetParamName        = "/papercut/server/url"
	tsOAuthClientParamName = "/tailscale/oauth-client"
	tsDir                  = "/tmp/tailscale"
	tsBaseURL              = "https://api.tailscale.com"
	cleanupTimeout         = 1800 * time.Millisecond // Lambda shutdown phase is capped at 2 seconds
)

var (
	ts struct {
		client    *tailscale.Client
		authKeyID *string
		server    *tsnet.Server
		nodeID    *tailcfg.StableNodeID
	}
	HandlerAdapter *httpadapter.HandlerAdapter
	cleanupSync    struct {
		once sync.Once
		wg   sync.WaitGroup
	}
)
