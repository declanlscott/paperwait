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
	hostname         = "printworks"
	targetParamName  = "/papercut/server/url"
	authKeyParamName = "/tailscale/auth-key"
	tailscaleDir     = "/tmp/tailscale"
	cleanupTimeout   = 1800 * time.Millisecond // Lambda shutdown phase is capped at 2 seconds
)

var (
	ts struct {
		server *tsnet.Server
		nodeId *tailcfg.StableNodeID
		client *tailscale.Client
	}
	HandlerAdapter *httpadapter.HandlerAdapter
	cleanupSync    struct {
		once *sync.Once
		wg   *sync.WaitGroup
	}
)
