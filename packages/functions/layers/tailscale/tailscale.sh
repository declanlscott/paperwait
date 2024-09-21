#!/bin/bash

set -euo pipefail

OWN_FILENAME="$(basename "$0")"
LAMBDA_EXTENSION_NAME="$OWN_FILENAME" # (external) extension name has to match the filename
TMPOWN_FILENAME="$(basename -s .sh "$0")"
TMPFILE="/tmp/${TMPOWN_FILENAME}.dat"
touch "${TMPFILE}"

# We now define some functions to be called later in the extension code

extecho() {
  echo "[${LAMBDA_EXTENSION_NAME}] $1"
}

# Graceful Shutdown
_term() {
  extecho "Received SIGTERM"
  # forward SIGTERM to child procs and exit
  kill -TERM "$PID" 2>/dev/null
  extecho "Exiting"
  exit 0
}

forward_sigterm_and_wait() {
  trap _term SIGTERM
  wait "$PID"
  trap - SIGTERM
}

# Extension stage 1: Initialization
# To run any extension processes that need to start before the runtime
# initializes, run them before the /register
extecho "Initialization"

function get_parameter {
  echo $(curl -X POST "https://ssm.${AWS_REGION}.amazonaws.com/" \
    --aws-sigv4 "aws:amz:${AWS_REGION}:ssm" \
    --user "${AWS_ACCESS_KEY_ID}:${AWS_SECRET_ACCESS_KEY}" \
    --header "X-Amz-Security-Token: ${AWS_SESSION_TOKEN}" \
    --header "X-Amz-Target: AmazonSSM.GetParameter" \
    --header "Content-Type: application/x-amz-json-1.1" \
    --data "{\"Name\":\"$1\",\"WithDecryption\":$2}"
  )
}

# Get the Tailscale auth key from SSM
SSM_RESPONSE=$(get_parameter "/paperwait/org/$ORG_ID/tailscale/auth-key" true)
TAILSCALE_AUTH_KEY=$(echo "$SSM_RESPONSE" | jq -r '.Parameter.Value')

# Start Tailscale - we use the bash script modified for the extension directory
# structure from the Tailscale documentation here.  Note these provide symbolic link from /tmp/ to the /var/run, /var/cache,
# /var/run and /var/task directories whereas here we explicitly defin the socket as /tmp/tailscale.sock - note that --socket
# is a flag for Tailscale, not of the 'up' sub-command
# https://tailscale.com/kb/1112/userspace-networking/ and https://tailscale.com/kb/1113/aws-lambda/
extecho "Starting Tailscale init process"
/opt/bin/tailscaled --tun=userspace-networking --socks5-server=127.0.0.1:1055 --socket=/tmp/tailscale.sock --state /tmp/tailscale &
/opt/bin/tailscale --socket=/tmp/tailscale.sock up --authkey="$TAILSCALE_AUTH_KEY" --shields-up --hostname=paperwait-papercut-secure-bridge
extecho "Tailscale started"
ALL_PROXY=socks5://127.0.0.1:1055/
NO_PROXY=$AWS_LAMBDA_RUNTIME_API
extecho "Setup Tailscale as SOCKS5 server on port 1055 in the background"

# Run a while loop to check tailscale status and wait for it to be 'up' before continuing with the script.
MAX_ATTEMPTS=20
ATTEMPT=1
SLEEP=0.1
# Check if Tailscale is running
while [[ $(tailscale status) == *"stopped"* && $ATTEMPT -lt $MAX_ATTEMPTS ]]; do
  sleep "$SLEEP"
  extecho "Tailscale not up, waiting for $SLEEP seconds..."
  ((ATTEMPT++))
done

if [[ $ATTEMPT -eq $MAX_ATTEMPTS ]]; then
  extecho "Warning: Tailscale did not reach a running state within the allowed attempts. Continuing anyway..."
else
  extecho "Tailscale has started. Continuing with the script..."
fi

# Extension stage 2: Registration
# The extension registration also signals to Lambda to start initializing
# the runtime.  Note, once initialised, we only do anything on a shutdown event with this extension.
HEADERS="$(mktemp)"
extecho "Registering at http://${AWS_LAMBDA_RUNTIME_API}/2020-01-01/extension/register"
curl -sS -LD "$HEADERS" \
  -X POST "http://${AWS_LAMBDA_RUNTIME_API}/2020-01-01/extension/register" \
  -H "Lambda-Extension-Name: ${LAMBDA_EXTENSION_NAME}" \
  -d "{ \"events\": [\"SHUTDOWN\"] }" \
  -o "$TMPFILE"

RESPONSE="$(<$TMPFILE)"
HEADINFO="$(<$HEADERS)"
# Extract Extension ID from response headers
EXTENSION_ID="$(grep -Fi Lambda-Extension-Identifier "$HEADERS" | tr -d '[:space:]' | cut -d: -f2)"
extecho "Registration response: ${RESPONSE} with EXTENSION_ID ${EXTENSION_ID}"

# Extension stage 3: Event processing
# Continuous loop to wait for events from Extensions API
while true; do
  extecho "Waiting for event. Get /next event from http://${AWS_LAMBDA_RUNTIME_API}/2020-01-01/extension/event/next"

  # Get an event. The HTTP request will block until one is received
  curl -sS -L \
    --noproxy '*' \
    -XGET "http://${AWS_LAMBDA_RUNTIME_API}/2020-01-01/extension/event/next" \
    --header "Lambda-Extension-Identifier: ${EXTENSION_ID}" \
    > $TMPFILE &
  PID=$!
  forward_sigterm_and_wait

  EVENT_DATA="$(<$TMPFILE)"
  if [[ $EVENT_DATA == *"SHUTDOWN"* ]]; then
    extecho "Received SHUTDOWN event, disconnecting from Tailscale...";
    /opt/bin/tailscale logout
    extecho "Exiting...";
    exit 0
  fi

  extecho "Received event: ${EVENT_DATA}"
  sleep 0.2
done
