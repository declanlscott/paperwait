#!/usr/bin/env bash

# Abort on error
set -e

echo "Building container..."
docker build -t lambda-layer-builder .
echo "Container is ready."

echo "Creating target dist directory"
mkdir -p dist

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

CURRENT_DIR=$(pwd)
echo "Build layer with docker..."
docker run --rm \
  -v "${CURRENT_DIR}/package.lock.sh:/tmp/layer/package.lock.sh" \
  -v "${CURRENT_DIR}/dist:/tmp/layer/dist" \
  lambda-layer-builder

if [[ "${REBUILD_PACKAGE_LOCK}" == "YES" ]]; then
  echo "Result of rebuilding package lock file as requested."
  echo "File: ./lib/layer/package.lock.sh"
  echo "------- BEGIN FILE CONTENT -------"
  cat ./package.lock.sh
  echo "------- END FILE CONTENT ---------"
fi
