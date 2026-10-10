#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

ENV_FILE="${ROOT_DIR}/.env.test"

if [ -f "${ENV_FILE}" ]; then
  set -a
  source "${ENV_FILE}"
  set +a
fi

PORT="${PORT:-3000}"
HOST="http://localhost:${PORT}"

export PORT="${PORT}"
export NODE_ENV="test"
# Contract files log in many times from one IP; keep throttling out of their way
export LOGIN_RATE_LIMIT="${LOGIN_RATE_LIMIT:-1000}"

# Admin account the contract files log in with. The app creates it at startup from the
# BOOTSTRAP_* variables (skipped when it already exists); these are test-only credentials.
export BOOTSTRAP_ADMIN_EMAIL="${BOOTSTRAP_ADMIN_EMAIL:-contract-admin@example.com}"
export BOOTSTRAP_ADMIN_PASSWORD="${BOOTSTRAP_ADMIN_PASSWORD:-contract-admin-password}"

if ! command -v hurl &> /dev/null; then
  if [ -d "${HOME}/AppData/Local/Programs/hurl" ]; then
    export PATH="${HOME}/AppData/Local/Programs/hurl:${PATH}"
  fi
fi

echo "=== 1. Building application ==="
pnpm build

echo "=== 2. Deploying Prisma migrations on test database ==="
pnpm db:deploy

echo "=== 3. Starting NestJS application on port ${PORT} ==="
node dist/main.js &
APP_PID=$!

cleanup() {
  echo "=== Stopping NestJS application (PID: ${APP_PID}) ==="
  kill "${APP_PID}" 2>/dev/null || true
  wait "${APP_PID}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "=== 4. Waiting for application to be healthy at ${HOST}/health ==="
MAX_RETRIES=30
RETRY_COUNT=0
HEALTHY=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s -f "${HOST}/health" > /dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  sleep 1
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Waiting for app to start... ($RETRY_COUNT/$MAX_RETRIES)"
done

if [ $HEALTHY -ne 1 ]; then
  echo "Error: Application failed to start within ${MAX_RETRIES} seconds." >&2
  exit 1
fi

echo "Application is healthy! Preparing Hurl contract tests..."

RUN_ID=$(date +%s)
HURL_FILES=$(find "${ROOT_DIR}/test/e2e-contract" -name "*.hurl" | sort)

if [ -z "${HURL_FILES}" ]; then
  echo "Warning: No .hurl files found in test/e2e-contract"
  exit 0
fi

echo "=== 5. Running Hurl contract tests ==="
hurl --test \
  --variable base_url="${HOST}" \
  --variable run_id="${RUN_ID}" \
  --variable admin_email="${BOOTSTRAP_ADMIN_EMAIL}" \
  --variable admin_password="${BOOTSTRAP_ADMIN_PASSWORD}" \
  ${HURL_FILES}

echo "=== Hurl contract tests completed successfully! ==="
