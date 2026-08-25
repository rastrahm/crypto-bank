/**
 * Activo soportado por la demo (ETH nativo o ERC-20).
 */
export interface SupportedAsset {
  /** Clave estable para UI/state (p. ej. "ETH", "mUSD"). */
  id: string;
  /** Símbolo visible. */
  symbol: string;
  /** `native` = ETH del vault; `erc20` = token. */
  kind: "native" | "erc20";
  /** Address on-chain; `null` si es nativo. */
  address: string | null;
  /** Decimales del activo (ETH=18; USDC típico=6). */
  decimals: number;
}

/**
 * Configuración tipada del frontend leída desde variables NEXT_PUBLIC_*.
 */
export interface VaultAppConfig {
  rpcUrl: string;
  chainId: number;
  vaultAddress: string;
  /** Lista de monedas disponibles en el select (desde .env). */
  assets: SupportedAsset[];
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const DEFAULT_DECIMALS = 18;

/**
 * Parsea decimales opcionales (`0`–`255`). Default 18.
 */
function parseDecimals(raw: string | undefined, symbol: string): number {
  if (raw === undefined || raw === "") {
    return DEFAULT_DECIMALS;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 255) {
    throw new Error(`Decimales inválidos para ${symbol}: ${raw}`);
  }
  return n;
}

/**
 * Parsea `NEXT_PUBLIC_ASSETS`: `SYM:native[:decimals]` o `SYM:0x...[:decimals]`, separados por coma.
 *
 * @example ETH:native,mUSD:0xabc…,USDC:0xdef…:6
 */
export function parseAssetsEnv(raw: string): SupportedAsset[] {
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    throw new Error("NEXT_PUBLIC_ASSETS vacío");
  }

  const assets: SupportedAsset[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const sep = part.indexOf(":");
    if (sep <= 0) {
      throw new Error(`Activo inválido "${part}". Usá SYM:native[:d] o SYM:0x...[:d]`);
    }
    const symbol = part.slice(0, sep).trim();
    const rest = part.slice(sep + 1).trim();
    if (!symbol) {
      throw new Error(`Símbolo vacío en "${part}"`);
    }
    const id = symbol;
    if (seen.has(id.toLowerCase())) {
      throw new Error(`Activo duplicado: ${symbol}`);
    }
    seen.add(id.toLowerCase());

    const segments = rest.split(":").map((s) => s.trim());
    const head = segments[0] ?? "";
    const decimalsRaw = segments[1];

    if (head.toLowerCase() === "native") {
      if (segments.length > 2) {
        throw new Error(`Activo inválido "${part}"`);
      }
      assets.push({
        id,
        symbol,
        kind: "native",
        address: null,
        decimals: parseDecimals(decimalsRaw, symbol),
      });
      continue;
    }

    if (!ADDRESS_RE.test(head)) {
      throw new Error(`Address inválida para ${symbol}: ${head}`);
    }
    if (segments.length > 2) {
      throw new Error(`Activo inválido "${part}"`);
    }
    assets.push({
      id,
      symbol,
      kind: "erc20",
      address: head,
      decimals: parseDecimals(decimalsRaw, symbol),
    });
  }

  return assets;
}

/**
 * Lee y valida la configuración pública del vault para la demo.
 */
export function getVaultConfig(): VaultAppConfig {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "";
  const chainIdRaw = process.env.NEXT_PUBLIC_CHAIN_ID ?? "";
  const vaultAddress = process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "";
  const assetsRaw = process.env.NEXT_PUBLIC_ASSETS ?? "";
  const legacyMock = process.env.NEXT_PUBLIC_MOCK_TOKEN_ADDRESS ?? "";

  if (!rpcUrl || !chainIdRaw || !vaultAddress) {
    throw new Error("Faltan NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_CHAIN_ID o NEXT_PUBLIC_VAULT_ADDRESS");
  }

  const chainId = Number(chainIdRaw);
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error("NEXT_PUBLIC_CHAIN_ID inválido");
  }

  let assets: SupportedAsset[];
  if (assetsRaw.trim()) {
    assets = parseAssetsEnv(assetsRaw);
  } else if (legacyMock) {
    assets = parseAssetsEnv(`ETH:native,mUSD:${legacyMock}`);
  } else {
    throw new Error("Definí NEXT_PUBLIC_ASSETS (ej. ETH:native,mUSD:0x...:18)");
  }

  return { rpcUrl, chainId, vaultAddress, assets };
}

/** Versión segura para UI: no lanza si el env está incompleto. */
export function tryGetVaultConfig(): VaultAppConfig | null {
  try {
    return getVaultConfig();
  } catch {
    return null;
  }
}
