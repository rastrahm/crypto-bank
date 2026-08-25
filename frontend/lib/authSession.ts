import { verifyMessage } from "ethers";

const STORAGE_KEY = "crypto-bank.auth.v1";

/** Sesion de login por wallet persistida en localStorage. */
export interface AuthSession {
  address: string;
  walletRdns: string;
  walletName: string;
  signature: string;
  message: string;
  loggedAt: number;
}

/** Construye el mensaje de login a firmar con la wallet. */
export function buildLoginMessage(address: string, walletName: string, chainId: number): string {
  const ts = new Date().toISOString();
  return [
    "Crypto Bank Vault - Login",
    "",
    `Address: ${address}`,
    `Wallet: ${walletName}`,
    `Chain ID: ${chainId}`,
    `Issued At: ${ts}`,
    "",
    "Al firmar confirmas el inicio de sesion en la demo. No se transfiere ETH.",
  ].join("\n");
}

/** Verifica que `signature` recupere `session.address` para `session.message`. */
export function verifyAuthSession(session: AuthSession): boolean {
  if (!session.address || !session.signature || !session.message) {
    return false;
  }
  try {
    const recovered = verifyMessage(session.message, session.signature);
    return recovered.toLowerCase() === session.address.toLowerCase();
  } catch {
    return false;
  }
}

/** Lee la sesion persistida si es valida (incluye verifyMessage). */
export function loadAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!verifyAuthSession(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Persiste la sesion de login (solo si la firma es valida). */
export function saveAuthSession(session: AuthSession): void {
  if (!verifyAuthSession(session)) {
    throw new Error("Sesion invalida: la firma no corresponde a la address");
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

/** Elimina la sesion (logout). */
export function clearAuthSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
