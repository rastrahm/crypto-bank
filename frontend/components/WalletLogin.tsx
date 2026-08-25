"use client";

import { useEffect, useState, type JSX } from "react";
import { BrowserProvider } from "ethers";

import {
  buildLoginMessage,
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  verifyAuthSession,
  type AuthSession,
} from "@/lib/authSession";
import {
  discoverInjectedWallets,
  prioritizeTestWallets,
  type DiscoveredWallet,
} from "@/lib/wallets";
import { VaultClient } from "@/lib/vaultClient";
import { ensureWalletChain } from "@/lib/chainSwitch";

/**
 * @description Pantalla de login: elige wallet (MetaMask / Phantom / Solflare / otras EIP-6963) y firma.
 * @param {object} props - Props del login.
 * @param {number} props.chainId - Chain id requerida.
 * @param {string} props.rpcUrl - RPC para `wallet_addEthereumChain` si hace falta.
 * @param {(session: AuthSession, wallet: DiscoveredWallet) => Promise<void>} props.onLoggedIn - Callback post-login.
 * @returns {JSX.Element} UI de autenticación por wallet.
 */
export function WalletLogin({
  chainId,
  rpcUrl,
  onLoggedIn,
}: {
  chainId: number;
  rpcUrl: string;
  onLoggedIn: (session: AuthSession, wallet: DiscoveredWallet) => Promise<void>;
}): JSX.Element {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = (): void => {
      setWallets(prioritizeTestWallets(discoverInjectedWallets()));
    };
    refresh();
    const timer = window.setInterval(refresh, 1500);
    return () => window.clearInterval(timer);
  }, []);

  /**
   * @description Conecta la wallet, pide firma de login y persiste sesión.
   * @param {DiscoveredWallet} wallet - Wallet seleccionada.
   * @returns {Promise<void>}
   */
  async function handleLogin(wallet: DiscoveredWallet): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await wallet.provider.request({ method: "eth_requestAccounts", params: [] });
      await ensureWalletChain(wallet.provider, chainId, rpcUrl);
      const browser = new BrowserProvider(wallet.provider);
      const network = await browser.getNetwork();
      if (Number(network.chainId) !== chainId) {
        throw new Error(`Red incorrecta: esperaba chainId ${chainId}, obtuve ${network.chainId}`);
      }
      const signer = await browser.getSigner();
      const address = await signer.getAddress();
      const message = buildLoginMessage(address, wallet.name, chainId);
      const signature = await signer.signMessage(message);

      const session: AuthSession = {
        address,
        walletRdns: wallet.rdns,
        walletName: wallet.name,
        signature,
        message,
        loggedAt: Date.now(),
      };
      saveAuthSession(session);
      await onLoggedIn(session, wallet);
    } catch (err) {
      setError(VaultClient.formatError(err));
    } finally {
      setBusy(false);
    }
  }

  /**
   * @description Intenta restaurar sesión previa si la wallet sigue disponible.
   * @returns {Promise<void>}
   */
  async function tryRestore(): Promise<void> {
    const existing = loadAuthSession();
    if (!existing || !verifyAuthSession(existing)) {
      clearAuthSession();
      return;
    }
    const match = wallets.find((w) => w.rdns === existing.walletRdns);
    if (!match) return;
    setBusy(true);
    try {
      const browser = new BrowserProvider(match.provider);
      const accounts = (await browser.send("eth_accounts", [])) as string[];
      const current = accounts[0]?.toLowerCase();
      if (current && current === existing.address.toLowerCase()) {
        await onLoggedIn(existing, match);
      } else {
        clearAuthSession();
      }
    } catch {
      clearAuthSession();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (wallets.length > 0) {
      void tryRestore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al descubrir wallets
  }, [wallets.length]);

  return (
    <section
      aria-label="Login por wallet"
      className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Iniciar sesión</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Elegí una wallet EVM (MetaMask, Phantom, Solflare u otra detectada) y firmá el mensaje de login.
        </p>
      </div>

      {wallets.length === 0 ? (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-300">
          No se detectaron wallets. Instalá/activá MetaMask, Phantom o Solflare en el navegador.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Wallets disponibles">
          {wallets.map((wallet) => (
            <li key={wallet.uuid}>
              <button
                type="button"
                disabled={busy}
                aria-label={`Entrar con ${wallet.name}`}
                onClick={() => void handleLogin(wallet)}
                className="flex w-full items-center gap-3 rounded-lg border border-zinc-300 px-3 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                {wallet.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={wallet.icon} alt="" width={28} height={28} className="rounded" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded bg-emerald-700 text-xs text-white">
                    {wallet.name.slice(0, 1)}
                  </span>
                )}
                <span>{wallet.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </section>
  );
}
