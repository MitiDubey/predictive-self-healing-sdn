#!/usr/bin/env bash
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "[-] Please run with sudo:"
    echo "    sudo $0"
    exit 1
fi

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET_DIR="/opt/cornerstone"

echo "========================================================"
echo "🔄 Updating Cornerstone Controller & Topology"
echo "   Source: ${SOURCE_DIR}"
echo "   Target: ${TARGET_DIR}"
echo "========================================================"

# Step 1: Sync updated files
echo "[+] Syncing updated controller, topology, and scripts to ${TARGET_DIR}..."
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.venv' "${SOURCE_DIR}/" "${TARGET_DIR}/"

# Step 2: Ensure correct ownership and permissions
chown -R root:www-data "${TARGET_DIR}"
chmod -R 775 "${TARGET_DIR}/logs" "${TARGET_DIR}/results" "${TARGET_DIR}/dashboard" 2>/dev/null || true
chmod 664 "${TARGET_DIR}/traffic_data.csv" 2>/dev/null || true

# Step 3: Flush any hung Mininet switches
echo "[+] Flushing Mininet and stale Open vSwitch bridges..."
mn -c >/dev/null 2>&1 || true

# Step 4: Restart controller and dashboard daemons
echo "[+] Restarting cornerstone-controller and cornerstone-dashboard services..."
systemctl restart cornerstone-controller
systemctl restart cornerstone-dashboard
sleep 2

# Step 5: Check status
if systemctl is-active --quiet cornerstone-controller && systemctl is-active --quiet cornerstone-dashboard; then
    echo "========================================================"
    echo "✅ Controller & Dashboard successfully updated and running!"
    echo "   Now start Mininet:"
    echo "   sudo mn --custom /opt/cornerstone/topology/redundant_topology.py --topo redundant \\"
    echo "     --controller=remote,ip=127.0.0.1,port=6653 \\"
    echo "     --switch ovs,protocols=OpenFlow13 \\"
    echo "     --arp"
    echo "========================================================"
else
    echo "========================================================"
    echo "❌ Controller failed to start. Showing last 25 log lines:"
    journalctl -u cornerstone-controller -n 25 --no-pager
    echo "========================================================"
    exit 1
fi

