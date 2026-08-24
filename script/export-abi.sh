#!/usr/bin/env bash
# Exporta ABIs desde out/ hacia frontend/abi/ para Next.js + ethers.js.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/out"
ABI_DIR="$ROOT/frontend/abi"

mkdir -p "$ABI_DIR"

export PATH="${HOME}/.foundry/bin:${PATH}"

echo "==> forge build"
(cd "$ROOT" && forge build)

if ! command -v jq >/dev/null 2>&1; then
  echo "error: se requiere jq para extraer el campo abi" >&2
  exit 1
fi

extract_abi() {
  local artifact="$1"
  local dest="$2"
  if [[ ! -f "$artifact" ]]; then
    echo "error: no existe $artifact (¿compilaste el contrato?)" >&2
    exit 1
  fi
  jq '.abi' "$artifact" > "$dest"
  echo "  wrote $dest"
}

echo "==> export ABIs"
extract_abi "$OUT_DIR/CryptoBankVault.sol/CryptoBankVault.json" "$ABI_DIR/CryptoBankVault.json"
extract_abi "$OUT_DIR/MockERC20.sol/MockERC20.json" "$ABI_DIR/MockERC20.json"
extract_abi "$OUT_DIR/ICryptoBankVault.sol/ICryptoBankVault.json" "$ABI_DIR/ICryptoBankVault.json"

echo "==> listo"
ls -la "$ABI_DIR"
