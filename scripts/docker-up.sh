#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.compose"

find_free_port() {
	local port="$1"
	while (echo >"/dev/tcp/127.0.0.1/${port}") >/dev/null 2>&1; do
		port=$((port + 1))
	done
	echo "${port}"
}

api_start="${RAWVIEWER_HOST_API_PORT_START:-8080}"
web_port="${RAWVIEWER_HOST_WEB_PORT:-5173}"

api_port="$(find_free_port "${api_start}")"
if [[ "${web_port}" == "${api_port}" ]]; then
	api_port="$(find_free_port "$((api_port + 1))")"
fi

cat > "${ENV_FILE}" <<EOF
RAWVIEWER_HOST_API_PORT=${api_port}
RAWVIEWER_HOST_WEB_PORT=${web_port}
EOF

echo "Selected ports:"
echo "  API: ${api_port}"
echo "  WEB: ${web_port}"

cd "${ROOT_DIR}"
docker compose --env-file "${ENV_FILE}" up -d --build "$@"

echo
echo "Frontend: http://localhost:${web_port}"
echo "Backend : http://localhost:${api_port}/api/healthz"
