#!/usr/bin/env bash
set -euo pipefail

# Directory locations
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SOURCE_DIR="$(cd "${ROOT_DIR}/../ecommerce-domain/e2e" && pwd)"
DEST_DIR="${ROOT_DIR}/test/e2e-contract"

echo "Syncing e2e contracts from: ${SOURCE_DIR}"
echo "                       to: ${DEST_DIR}"

if [ ! -d "${SOURCE_DIR}" ]; then
  echo "Error: Source directory ${SOURCE_DIR} does not exist." >&2
  exit 1
fi

rm -rf "${DEST_DIR}"
mkdir -p "${DEST_DIR}"
cp -R "${SOURCE_DIR}/"* "${DEST_DIR}/"

echo "Sync completed successfully."
