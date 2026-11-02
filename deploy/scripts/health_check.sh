#!/usr/bin/env bash
# ==============================================================================
# Cornerstone Health Check Script
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "========================================================"
echo "🩺 Cornerstone SDN Health & Diagnostics"
echo "   Directory: ${ROOT_DIR}"
echo "========================================================"

FAILED=0

# Check 1: Open vSwitch
if command -v ovs-vsctl >/dev/null 2>&1 && ovs-vsctl show >/dev/null 2>&1; then
    echo "  [PASS] Open vSwitch service is active."
else
    echo "  [WARN] Open vSwitch service is not responding or not running."
fi

# Check 2: Controller Process & OpenFlow Port
if pgrep -f "cornerstone_controller_ml" >/dev/null 2>&1 || pgrep -f "run_controller.py" >/dev/null 2>&1; then
    echo "  [PASS] SDN Controller process is running."
else
    echo "  [FAIL] SDN Controller process is not running."
    FAILED=$((FAILED + 1))
fi

if command -v ss >/dev/null 2>&1; then
    if ss -lnt | grep -q ":6653 "; then
        echo "  [PASS] OpenFlow port 6653 is listening."
    else
        echo "  [INFO] Port 6653 is not active yet (controller may be starting up)."
    fi
fi

# Check 3: Dashboard Service & Port 3000
if command -v curl >/dev/null 2>&1; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/metrics || true)
    if [[ "$HTTP_CODE" == "200" ]]; then
        echo "  [PASS] Dashboard API (/api/metrics) returned HTTP 200 OK."
    else
        echo "  [FAIL] Dashboard API returned HTTP ${HTTP_CODE} (expected 200)."
        FAILED=$((FAILED + 1))
    fi
else
    echo "  [WARN] curl not found; skipping HTTP probe."
fi

# Check 4: ML Model File
if [[ -f "${ROOT_DIR}/ml/best_model.joblib" ]]; then
    MODEL_SIZE=$(ls -lh "${ROOT_DIR}/ml/best_model.joblib" | awk '{print $5}')
    echo "  [PASS] ML model file exists (${MODEL_SIZE})."
else
    echo "  [FAIL] ML model file missing at ml/best_model.joblib."
    FAILED=$((FAILED + 1))
fi

# Check 5: Log and Results Directories
for d in "logs" "results/plots"; do
    if [[ -d "${ROOT_DIR}/${d}" ]]; then
        echo "  [PASS] Directory ${d} exists."
    else
        echo "  [WARN] Directory ${d} missing."
    fi
done

echo "========================================================"
if [[ $FAILED -eq 0 ]]; then
    echo "✅ All core services and components passed health checks!"
else
    echo "⚠️ Health check completed with ${FAILED} failure(s)."
fi
echo "========================================================"
exit $FAILED

