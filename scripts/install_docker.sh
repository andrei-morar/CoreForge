#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "   CoreForge — Instalare Automată Docker Engine (Ubuntu 24.04)"
echo "=========================================================="

if [ "$EUID" -ne 0 ]; then
  echo "❌ Acest script trebuie rulat cu privilegii de administrator (sudo)."
  echo "👉 Rulează: sudo bash scripts/install_docker.sh"
  exit 1
fi

TARGET_USER="${SUDO_USER:-$USER}"

echo "📦 1. Actualizare pachete și instalare dependențe preliminare..."
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg lsb-release

echo "🔑 2. Configurare cheie oficială Docker GPG..."
install -m 0755 -d /etc/apt/keyrings
if [ -f /etc/apt/keyrings/docker.asc ]; then
  rm -f /etc/apt/keyrings/docker.asc
fi
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo "📂 3. Adăugare depozit oficial Docker APT pentru Ubuntu $(lsb_release -cs)..."
UBUNTU_CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $UBUNTU_CODENAME stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "📥 4. Instalare Docker Engine, CLI, Containerd și Docker Compose..."
apt-get update -qq
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "⚙️  5. Pornire și activare serviciu Docker în systemd..."
systemctl enable --now docker
systemctl start docker

echo "👤 6. Adăugare utilizator ($TARGET_USER) în grupul docker..."
usermod -aG docker "$TARGET_USER"

# Ajustare permisiuni pe socket pentru acces imediat fără logout obligatoriu
if [ -S /var/run/docker.sock ]; then
  chmod 666 /var/run/docker.sock
fi

echo "=========================================================="
echo "✅ Docker Engine a fost instalat și activat cu succes!"
docker --version
docker compose version
echo "🐳 Socket-ul Docker (/var/run/docker.sock) este pregătit."
echo "=========================================================="
