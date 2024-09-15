#!/usr/bin/env bash

DISTRO_NAME="$(grep -oP '(?<=^NAME=).+' < /etc/os-release | tr -d '"')"
DISTRO_VERSION="$(grep -oP '(?<=^VERSION=).+' < /etc/os-release | tr -d '"')"
DISTRO_TITLE="${DISTRO_NAME} ${DISTRO_VERSION}"
JQ_RPM_PATH="${DIST_LAYER_PATH}/tmp_extracts/usr/bin/jq"
TAILSCALE_RPM_PATH="/tmp/tailscale.rpm"
PWD_PATH="$(pwd)"
START_PATH="${WORKDIR:=$PWD_PATH}"
DIST_LAYER_PATH="${START_PATH}/dist/layer"
DIST_LAYER_ZIP_NAME="tailscale-layer.zip"
DIST_LAYER_ASSET_PATH="${START_PATH}/dist/${DIST_LAYER_ZIP_NAME}"

function get_dependency_locations {
  if [[ ! -x ./dependency-version.lock.sh ]]; then
    echo "Couldn't use the dependency location lock file as it doesn't exist"
    echo "or it is not executable."
    echo ""
    echo "Please note: Do not use the latest versions in a build pipeline, "
    echo "as this might lead to issues that are hard to reproduce."
    echo ""
    echo "Determining dependency locations on the fly, using latest:"
    source ./determine-dependency-locations.sh
  else
    source ./dependency-version.lock.sh
  fi

  if [[ "Z${TAILSCALE_RPM_URL}" == "Z" ]]; then
    echo "Something went wrong, dependency locations could not be determined."
    exit 1
  fi
}

function download_tailscale {
  echo "Downloading latest Tailscale image for ${DISTRO_TITLE}"
  curl -L -s "${TAILSCALE_RPM_URL}" -o "${TAILSCALE_RPM_PATH}" > /dev/null 2>&1
}

function download_jq {
  echo "Downloading latest jq image for ${DISTRO_TITLE}"
  curl -L -s "${JQ_RPM_URL}" -o "${JQ_RPM_PATH}" > /dev/null 2>&1
  chmod +x "${JQ_RPM_PATH}"
}

function create_dist_dirs {
  echo "Creating dist directories"
  mkdir -p "${DIST_LAYER_PATH}/tmp_extracts/usr/bin"
  mkdir -p "${DIST_LAYER_PATH}/extensions"
  mkdir -p "${DIST_LAYER_PATH}/bin"
}

function extract_package {
  rpm_to_extract=$1
  cd "${DIST_LAYER_PATH}/tmp_extracts"
  echo "Extracting ${rpm_to_extract} package"
  rpm2cpio "${rpm_to_extract}" | cpio -idmv --no-absolute-filenames
  cd "${START_PATH}"
}

function copy_layer_prereqs {
  echo "Copying Lambda Layer prereqs"
  cp -r "${START_PATH}/extension.sh" "${DIST_LAYER_PATH}/extensions"
  chmod 555 "${DIST_LAYER_PATH}/extensions/extension.sh"
}

function copy_bins_to_layer {
  ls -la "${DIST_LAYER_PATH}/tmp_extracts/usr/bin"
  cp -r "${DIST_LAYER_PATH}/tmp_extracts/usr/bin/"{jq,tailscale} "${DIST_LAYER_PATH}/bin"
  cp -r "${DIST_LAYER_PATH}/tmp_extracts/usr/sbin/tailscaled" "${DIST_LAYER_PATH}/bin"
}

function cleanup {
  rm -r "${DIST_LAYER_PATH}/tmp_extracts"
}

function build_layer_asset {
  cd "${DIST_LAYER_PATH}"

  echo "Zipping Lambda Layer"
  zip -r "../${DIST_LAYER_ZIP_NAME}" ./bin ./extensions

  cd "${START_PATH}"
}

function main {
  echo $(yum list installed gnupg2)

  get_dependency_locations

  create_dist_dirs

  download_jq
  download_tailscale

  # Uses the RPM Paths to extract
  extract_package "$TAILSCALE_RPM_PATH"

  copy_layer_prereqs

  copy_bins_to_layer

  cleanup

  build_layer_asset
}

set -ex
echo "Building..."
main
echo "Done."
