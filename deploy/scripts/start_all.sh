#!/usr/bin/env bash
# Start all Cornerstone components in background (useful for WSL, local testing, or non-systemd environments)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

mkdir -p logs

echo "Starting Cornerstone Controller..."
if [[ -f "${ROOT_DIR}/.venv/bin/python" ]]; then
    PYTHON_BIN="${ROOT_DIR}/.venv/bin/python"
else
    PYTHON_BIN="python3"
fi

nohup "${PYTHON_BIN}" "${ROOT_DIR}/controller/run_controller.py" >> "${ROOT_DIR}/logs/controller.log" 2>&1 &
echo $! > "${ROOT_DIR}/logs/controller.pid"
echo "Controller PID: $(cat "${ROOT_DIR}/logs/controller.pid")"

echo "Starting Cornerstone Dashboard..."
cd "${ROOT_DIR}/dashboard"
nohup npm start >> "${ROOT_DIR}/logs/dashboard.log" 2>&1 &
echo $! > "${ROOT_DIR}/logs/dashboard.pid"
echo "Dashboard PID: $(cat "${ROOT_DIR}/logs/dashboard.pid")"

echo "All services started. Access dashboard at: http://localhost:3000"

