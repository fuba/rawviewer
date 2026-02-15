#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.compose"

cd "${ROOT_DIR}"
if [[ -f "${ENV_FILE}" ]]; then
	docker compose --env-file "${ENV_FILE}" down "$@"
else
	docker compose down "$@"
fi
