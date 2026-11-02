#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Cornerstone SDN Production Deployment Script (Ubuntu 22.04 / 24.04 LTS)
# ==============================================================================

if [[ $EUID -ne 0 ]]; then
   echo "[-] This script must be run as root (or with sudo)."
   exit 1
fi

INSTALL_DIR="/opt/cornerstone"
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "========================================================"
echo "🚀 Starting Cornerstone SDN Deployment"
echo "   Source Directory: ${CURRENT_DIR}"
echo "   Target Directory: ${INSTALL_DIR}"
echo "========================================================"

# Step 1: System packages
echo "[+] Step 1: Updating packages and installing prerequisites..."
apt-get update -y
apt-get install -y \
    openvswitch-switch \
    mininet \
    python3 \
    python3-pip \
    python3-venv \
    nginx \
    curl \
    git \
    logrotate \
    net-tools

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "[+] Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "[+] Node.js is already installed: $(node -v)"
fi

# Step 2: Open vSwitch service
echo "[+] Step 2: Verifying Open vSwitch service..."
systemctl enable openvswitch-switch
systemctl start openvswitch-switch
ovs-vsctl show >/dev/null

# Step 3: Copy or sync repository to /opt/cornerstone if running externally
if [[ "${CURRENT_DIR}" != "${INSTALL_DIR}" ]]; then
    echo "[+] Step 3: Copying repository files to ${INSTALL_DIR}..."
    mkdir -p "${INSTALL_DIR}"
    rsync -av --exclude='.git' --exclude='node_modules' --exclude='.venv' "${CURRENT_DIR}/" "${INSTALL_DIR}/"
fi

cd "${INSTALL_DIR}"

# Step 4: Python Virtual Environment & Dependencies
echo "[+] Step 4: Configuring Python virtual environment..."
if [[ ! -d "${INSTALL_DIR}/.venv" ]]; then
    python3 -m venv "${INSTALL_DIR}/.venv"
fi
"${INSTALL_DIR}/.venv/bin/pip" install --upgrade pip
"${INSTALL_DIR}/.venv/bin/pip" install -r "${INSTALL_DIR}/requirements.txt"

# Step 5: Dashboard Production Build
echo "[+] Step 5: Installing Dashboard dependencies and building Next.js..."
cd "${INSTALL_DIR}/dashboard"
npm ci
npm run build
cd "${INSTALL_DIR}"

# Step 6: Log Directories & Permissions
echo "[+] Step 6: Setting up log directories and permissions..."
mkdir -p "${INSTALL_DIR}/logs"
mkdir -p "${INSTALL_DIR}/results/plots"

touch "${INSTALL_DIR}/logs/recovery_events.csv"
touch "${INSTALL_DIR}/logs/security_events.csv"
touch "${INSTALL_DIR}/logs/failure_events.csv"
touch "${INSTALL_DIR}/traffic_data.csv"

# Ensure www-data can read logs and results for the dashboard
chown -R root:www-data "${INSTALL_DIR}"
chmod -R 775 "${INSTALL_DIR}/logs" "${INSTALL_DIR}/results"
chmod 664 "${INSTALL_DIR}/traffic_data.csv"

# Step 7: Install systemd services
echo "[+] Step 7: Installing systemd service units..."
cp "${INSTALL_DIR}/deploy/systemd/cornerstone-controller.service" /etc/systemd/system/
cp "${INSTALL_DIR}/deploy/systemd/cornerstone-dashboard.service" /etc/systemd/system/

systemctl daemon-reload
systemctl enable cornerstone-controller
systemctl enable cornerstone-dashboard
systemctl restart cornerstone-controller
systemctl restart cornerstone-dashboard

# Step 8: Install Nginx Configuration
echo "[+] Step 8: Configuring Nginx reverse proxy..."
cp "${INSTALL_DIR}/deploy/nginx/cornerstone.conf" /etc/nginx/sites-available/cornerstone
if [[ ! -f /etc/nginx/sites-enabled/cornerstone ]]; then
    ln -s /etc/nginx/sites-available/cornerstone /etc/nginx/sites-enabled/
fi
# Remove default site if it exists
if [[ -f /etc/nginx/sites-enabled/default ]]; then
    rm -f /etc/nginx/sites-enabled/default
fi
nginx -t
systemctl restart nginx

# Step 9: Install Logrotate
echo "[+] Step 9: Installing logrotate policy..."
cp "${INSTALL_DIR}/deploy/logrotate/cornerstone" /etc/logrotate.d/cornerstone
chmod 644 /etc/logrotate.d/cornerstone

echo "========================================================"
echo "✅ Cornerstone SDN deployment complete!"
echo "   Dashboard URL: http://<server-ip> (via Nginx Port 80)"
echo "   Controller Status: $(systemctl is-active cornerstone-controller)"
echo "   Dashboard Status:  $(systemctl is-active cornerstone-dashboard)"
echo "   Run health check:  ${INSTALL_DIR}/deploy/scripts/health_check.sh"
echo "========================================================"

