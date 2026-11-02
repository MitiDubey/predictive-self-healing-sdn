#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Open vSwitch Diagnostic & Repair Script for Cornerstone
# ==============================================================================

if [[ $EUID -ne 0 ]]; then
    echo "[-] This script must be run as root or with sudo:"
    echo "    sudo $0"
    exit 1
fi

echo "========================================================"
echo "🔧 Diagnosing and Starting Open vSwitch..."
echo "========================================================"

# Step 1: Ensure kernel module is loaded
echo "[+] Step 1: Checking kernel module..."
if modprobe openvswitch 2>/dev/null; then
    echo "    Kernel module 'openvswitch' loaded successfully."
else
    echo "    Notice: modprobe openvswitch skipped (userspace fallback or already built-in)."
fi

# Step 2: Ensure runtime directories exist
mkdir -p /var/run/openvswitch /etc/openvswitch /var/log/openvswitch

# Step 3: Ensure database exists
if [[ ! -f /etc/openvswitch/conf.db ]]; then
    echo "[+] Initializing Open vSwitch database..."
    if command -v ovsdb-tool >/dev/null 2>&1; then
        ovsdb-tool create /etc/openvswitch/conf.db /usr/share/openvswitch/vswitch.ovsschema 2>/dev/null || true
    fi
fi

# Step 4: Restart the service using systemd or sysvinit
echo "[+] Step 4: Starting Open vSwitch service..."
STARTED=false

if command -v systemctl >/dev/null 2>&1 && systemctl is-system-running >/dev/null 2>&1; then
    systemctl unmask openvswitch-switch 2>/dev/null || true
    systemctl enable openvswitch-switch 2>/dev/null || true
    systemctl restart openvswitch-switch && STARTED=true || true
fi

if [[ "$STARTED" != "true" ]] && command -v service >/dev/null 2>&1; then
    service openvswitch-switch restart && STARTED=true || true
fi

if [[ "$STARTED" != "true" ]] && [[ -x /etc/init.d/openvswitch-switch ]]; then
    /etc/init.d/openvswitch-switch restart && STARTED=true || true
fi

# Step 5: Test ovs-vsctl
echo "[+] Step 5: Verifying Open vSwitch status..."
if ovs-vsctl show >/dev/null 2>&1; then
    echo "========================================================"
    echo "✅ Open vSwitch is now healthy and active!"
    ovs-vsctl show
    echo "========================================================"
else
    echo "========================================================"
    echo "⚠️ Open vSwitch could not be started automatically."
    echo "Check logs with: journalctl -u openvswitch-switch -n 20"
    echo "Or in WSL, run: sudo service openvswitch-switch start"
    echo "========================================================"
    exit 1
fi

