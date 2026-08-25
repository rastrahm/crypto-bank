/**
 * PM2 ecosystem — Crypto Bank frontend (Fase 5).
 * Uso: desde /opt/crypto-bank/frontend → pm2 start ../deploy/vps/ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: "crypto-bank-frontend",
      cwd: __dirname + "/../../frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      max_memory_restart: "512M",
      time: true,
    },
  ],
};
