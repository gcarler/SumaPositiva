#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
service_pids=()

cleanup() {
  trap - EXIT INT TERM
  if [ "${#service_pids[@]}" -gt 0 ]; then
    kill "${service_pids[@]}" 2>/dev/null || true
    wait "${service_pids[@]}" 2>/dev/null || true
  fi
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Run the servers directly so cleanup owns their processes.
uv run --project backend uvicorn app.main:app --app-dir backend \
  --reload --reload-dir backend/app --host 127.0.0.1 --port 8000 &
service_pids+=("$!")
bun --bun node_modules/next/dist/bin/next dev -p 3000 &
service_pids+=("$!")

# If either server stops, stop the other and preserve the exit status.
wait -n "${service_pids[@]}"
