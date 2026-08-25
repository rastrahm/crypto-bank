#!/usr/bin/env bash
# Bootstrap Ubuntu 22.04/24.04 para demo Crypto Bank (Fase 5).
# Uso: sudo bash deploy/vps/setup.sh
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Ejecutá con sudo: sudo bash deploy/vps/setup.sh" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx git curl ca-certificates gnupg ufw

# Node 20
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

npm install -g pm2

ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
echo ">>> ufw: revisá 'ufw status' y 'ufw enable' cuando estés listo."

echo ">>> Node $(node -v) | npm $(npm -v) | pm2 $(pm2 -v)"
echo ">>> Siguiente: clonar repo en /opt/crypto-bank y seguir doc/VPS.md"
