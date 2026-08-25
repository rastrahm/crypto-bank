import { verifyMessage } from "ethers";

const STORAGE_KEY = "crypto-bank.auth.v1";

/** Sesión de login por wallet persistida en localStorage. */
export interface AuthSession {
  address: string;
  walletRdns: string;
  walletName: string;
  signature: string;
  message: string;
  loggedAt: number;
}

/**
 * @description Construye el mensaje de login a firmar con la wallet.
 * @param {string} address - Address EOA.
 * @param {string} walletName - Nombre de la wallet elegida.
 * @param {number} chainId - Chain id esperada.
 * @returns {string} Mensaje legible para `personal_sign`.
 */
export function buildLoginMessage(address: string, walletName: string, chainId: number): string {
  const ts = new Date().toISOString();
  return [
    "Crypto Bank Vault — Login",
    "",
    `Address: ${address}`,
    `Wallet: ${walletName}`,
    `Chain ID: ${chainId}`,
    `Issued At: ${ts}`,
    "",
    "Al firmar confirmás el inicio de sesión en la demo. No se transfiere ETH.",
  ].join("\n");
}

/**
 * Verifica que `signature` recupere `session.address` para `session.message`.
 */
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

/**
 * @description Lee la sesión persistida si es válida (incluye verifyMessage).
 * @returns {AuthSession | null} Sesión o null.
 */
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

/**
 * @description Persiste la sesión de login (solo si la firma es válida).
 * @param {AuthSession} session - Datos firmados.
 * @returns {void}
 */
export function saveAuthSession(session: AuthSession): void {
  if (!verifyAuthSession(session)) {
    throw new Error("Sesión inválida: la firma no corresponde a la address");
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

/**
 * @description Elimina la sesión (logout).
 * @returns {void}
 */
export function clearAuthSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
