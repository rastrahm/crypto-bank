# Artefactos de empaquetado / VPS (Fase 5)
#
# Ver playbook: ../doc/VPS.md
#
# - setup.sh                 bootstrap Ubuntu (Node 20, nginx, pm2, ufw)
# - ecosystem.config.cjs     PM2 → next start :3000 en 127.0.0.1
# - nginx-crypto-bank.conf   reverse proxy
# - crypto-bank-frontend.service  alternativa systemd
