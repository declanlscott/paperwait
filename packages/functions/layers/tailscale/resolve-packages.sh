#!/usr/bin/env bash

DISTRO_NAME="$(grep -oP '(?<=^NAME=).+' < /etc/os-release | tr -d '"')"
if [[ "$DISTRO_NAME" != "Amazon Linux" ]]; then
  echo "This script requires Amazon Linux, at the moment it is detected as: ${DISTRO_NAME}"
  exit 2
fi

AMAZON_LINUX_VERSION="$(grep -oP '(?<=^VERSION=).+' < /etc/os-release | tr -d '"')"
if [[ "$AMAZON_LINUX_VERSION" != "2023" ]]; then
  echo "This script requires Amazon Linux 2023, at the moment it is detected as: ${AMAZON_LINUX_VERSION}"
  exit 2
fi

DRY_RUN=0
if [ "$1" = "--dry-run" ] || [ "$2" = "--dry-run" ]; then
    DRY_RUN=1
fi

DEFAULT_LOCK_FILE="./package.lock.sh"
if [ "Z$LOCK_FILE" == "Z" ]; then
  LOCK_FILE=$DEFAULT_LOCK_FILE
fi

function update_repos {
  echo "Installing dnf-plugins-core..."\
  sudo dnf install -y dnf-plugins-core

  echo "Add Tailscale repo"
  TAILSCALE_REPO_URL="https://pkgs.tailscale.com/stable/amazon-linux/${AMAZON_LINUX_VERSION}/tailscale.repo"
  sudo dnf config-manager -y --add-repo "$TAILSCALE_REPO_URL"

  echo "Update DNF's index and GPG keys"
  sudo dnf update --downloadonly -y
}

function create_new_lock_file {
  if [ "$DRY_RUN" = "0" ]; then
    echo "#!/usr/bin/env bash" > $LOCK_FILE
  fi
}

function write_to_lock_file {
  new_line=$1
  if [ "$DRY_RUN" = "0" ]; then
    echo "${new_line}" >> $LOCK_FILE
  fi
}

function query_repo {
  echo "$(dnf repoquery --location "$1" --archlist aarch64 --latest-limit=1 -y)"
}

function resolve_jq_url {
  echo "Get jq URL to download"
  LATEST_JQ_VERSION_TAG="$(curl -L -s https://api.github.com/repos/stedolan/jq/releases/latest | jq -r ".tag_name")"
  export JQ_URL="https://github.com/stedolan/jq/releases/download/${LATEST_JQ_VERSION_TAG}/jq-linux-arm64"
  write_to_lock_file "export JQ_URL=\"${JQ_URL}\""
  echo "Resolved it to: ${JQ_URL}"
}

function resolve_tailscale_rpm_url {
  echo "Retrieve the latest version of Tailscale to use and determine the"
  echo "RPM location..."
  export TAILSCALE_RPM_URL="$(query_repo tailscale)"
  write_to_lock_file "export TAILSCALE_RPM_URL=\"${TAILSCALE_RPM_URL}\""
  echo "Resolved it to: ${TAILSCALE_RPM_URL}"
}

function main {
  if [[ "${IN_DOCKER}" != "YES" ]]; then
    update_repos
  fi

  create_new_lock_file

  echo "Determining latest packages to use..."
  resolve_tailscale_rpm_url
  resolve_jq_url
  echo  "Done."
  echo ""
  echo "Final result written to $LOCK_FILE:"
  cat "$LOCK_FILE"
  chmod +x "$LOCK_FILE"
  echo ""
}

set -ex
main
