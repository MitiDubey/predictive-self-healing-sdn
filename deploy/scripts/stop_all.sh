#!/usr/bin/env bash
# Stop all Cornerstone background services

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Stopping Cornerstone services..."

if [[ -f "${ROOT_DIR}/logs/controller.pid" ]]; then
    PID=$(cat "${ROOT_DIR}/logs/controller.pid")
    echo "Stopping Controller (PID: ${PID})..."
    kill -TERM "${PID}" 2>/dev/null || true
    rm -f "${ROOT_DIR}/logs/controller.pid"
fi

if [[ -f "${ROOT_DIR}/logs/dashboard.pid" ]]; then
    PID=$(cat "${ROOT_DIR}/logs/dashboard.pid")
    echo "Stopping Dashboard (PID: ${PID})..."
    kill -TERM "${PID}" 2>/dev/null || true
    rm -f "${ROOT_DIR}/logs/dashboard.pid"
fi

# Fallback cleanup
pkill -f "run_controller.py" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true

echo "Cornerstone services stopped."

