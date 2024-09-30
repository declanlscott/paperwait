#!/usr/bin/env bash

# Abort on error
set -e

echo "Building container..."
docker build -t lambda-layer-builder .
echo "Container is ready."

CURRENT_DIR=$(pwd)
DIST_DIR="${CURRENT_DIR}/../dist"

if [ -d "$DIST_DIR" ]; then
  rm -rf "$DIST_DIR"
  echo "Removed existing dist directory"
fi

echo "Creating target dist directory"
mkdir -p "$DIST_DIR"

if [[ ! -e ./package.lock.sh ]]; then
  echo "Package lock file does not exist yet"
  echo "Creating package lock file so it can be written to"
  touch ./package.lock.sh
fi

if [[ "${REBUILD_PACKAGE_LOCK}" == "YES" ]]; then
  echo "Rebuilding package lock file as requested."
  mv ./package.lock.sh ./package-old.lock.sh
  touch ./package.lock.sh
fi

echo "Build layer with docker..."
sleep 1

docker run --rm \
  -v "${CURRENT_DIR}/package.lock.sh:/tmp/layer/package.lock.sh" \
  -v "${DIST_DIR}:/tmp/layer/dist" \
  lambda-layer-builder

if [[ "${REBUILD_PACKAGE_LOCK}" == "YES" ]]; then
  echo "Result of rebuilding package lock file as requested."
  echo "File: ./package.lock.sh"
  echo "------- BEGIN FILE CONTENT -------"
  cat ./package.lock.sh
  echo "------- END FILE CONTENT ---------"
  rm -f ./package-old.lock.sh
  echo "Removed old package lock file"
fi
