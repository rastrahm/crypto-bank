"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { VaultOp } from "@/components/AmountForm";
import { clearAuthSession, type AuthSession } from "@/lib/authSession";
import { tryGetVaultConfig, type SupportedAsset, type VaultAppConfig } from "@/lib/config";
import { VaultClient } from "@/lib/vaultClient";
import type { DiscoveredWallet } from "@/lib/wallets";

export interface VaultAppState {
  config: VaultAppConfig | null;
  client: VaultClient | null;
  session: AuthSession | null;
  walletName: string | null;
  selectedAssetId: string;
  selectedAsset: SupportedAsset | undefined;
  ledgers: Record<string, string>;
  paused: boolean;
  owner: string;
  status: string | null;
  busy: boolean;
  setSelectedAssetId: (id: string) => void;
  handleLoggedIn: (session: AuthSession, wallet: DiscoveredWallet) => Promise<void>;
  handleLogout: () => void;
  handleAction: (op: VaultOp, amount: string) => Promise<void>;
  handlePause: () => Promise<void>;
  handleUnpause: () => Promise<void>;
  handleSetTokenAllowed: (token: string, allowed: boolean) => Promise<void>;
  handleRescueETH: (to: string, amount: string) => Promise<void>;
  handleRescueERC20: (token: string, to: string, amount: string) => Promise<void>;
}

/** Estado y operaciones del dashboard (sesión, saldos, deposit/withdraw, pause). */
export function useVaultApp(): VaultAppState {
  const config = useMemo(() => tryGetVaultConfig(), []);
  const client = useMemo(() => (config ? new VaultClient(config) : null), [config]);

  const [session, setSession] = useState<AuthSession | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(config?.assets[0]?.id ?? "");
  const [ledgers, setLedgers] = useState<Record<string, string>>({});
  const [paused, setPaused] = useState(false);
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Incrementa al conectar para re-suscribir listeners EIP-1193. */
  const [watchEpoch, setWatchEpoch] = useState(0);

  const sessionRef = useRef<AuthSession | null>(null);
  sessionRef.current = session;

  const selectedAsset = useMemo(
    () => config?.assets.find((a) => a.id === selectedAssetId) ?? config?.assets[0],
    [config, selectedAssetId],
  );

  const refresh = useCallback(
    async (user: string): Promise<void> => {
      if (!client) return;
      const balances = await client.getBalances(user);
      setLedgers(balances.ledgers);
      setPaused(balances.paused);
      setOwner(balances.owner);
    },
    [client],
  );

  const handleLogout = useCallback((): void => {
    clearAuthSession();
    setSession(null);
    setWalletName(null);
    setLedgers({});
    setOwner("");
    setPaused(false);
    setStatus("Sesión cerrada");
    client?.useReadOnlyProvider();
  }, [client]);

  const handleLoggedIn = useCallback(
    async (nextSession: AuthSession, wallet: DiscoveredWallet): Promise<void> => {
      if (!client) return;
      setBusy(true);
      setStatus(null);
      try {
        await client.connectWallet(wallet.provider);
        setSession(nextSession);
        setWalletName(wallet.name);
        setWatchEpoch((n) => n + 1);
        await refresh(nextSession.address);
        setStatus(`Sesión iniciada con ${wallet.name}`);
      } catch (error) {
        clearAuthSession();
        setStatus(VaultClient.formatError(error));
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [client, refresh],
  );

  useEffect(() => {
    if (!client || !session || !config) return;

    return client.watchWallet({
      onAccountsChanged: (accounts) => {
        const next = accounts[0];
        if (!next) {
          handleLogout();
          setStatus("Wallet desconectada o sin cuentas");
          return;
        }
        const current = sessionRef.current;
        if (!current) return;
        if (next.toLowerCase() === current.address.toLowerCase()) return;

        const updated: AuthSession = {
          ...current,
          address: next,
          signature: "",
          message: "",
          loggedAt: Date.now(),
        };
        // Sin firma válida: no persistir restore engañoso.
        clearAuthSession();
        setSession(updated);
        void (async () => {
          try {
            await client.rebindWallet();
            await refresh(next);
            setStatus(`Cuenta cambiada a ${next}. Firmá de nuevo para persistir sesión.`);
          } catch (error) {
            handleLogout();
            setStatus(VaultClient.formatError(error));
          }
        })();
      },
      onChainChanged: (chainId) => {
        if (chainId !== config.chainId) {
          handleLogout();
          setStatus(`Red cambiada (chainId ${chainId}). Necesitás la red ${config.chainId}.`);
          return;
        }
        void (async () => {
          try {
            const address = await client.rebindWallet();
            const current = sessionRef.current;
            if (current && address.toLowerCase() !== current.address.toLowerCase()) {
              setSession({ ...current, address });
            }
            await refresh(address);
            setStatus(`Red OK (chainId ${chainId})`);
          } catch (error) {
            handleLogout();
            setStatus(VaultClient.formatError(error));
          }
        })();
      },
    });
  }, [client, session, config, watchEpoch, handleLogout, refresh]);

  async function handleAction(op: VaultOp, amount: string): Promise<void> {
    if (!client || !session || !selectedAsset) {
      throw new Error("Iniciá sesión y elegí una moneda");
    }
    setBusy(true);
    setStatus(null);
    try {
      const tx =
        op === "deposit"
          ? await client.depositAsset(selectedAsset, amount)
          : await client.withdrawAsset(selectedAsset, amount);
      setStatus(`Tx enviada: ${tx.hash}`);
      await tx.wait();
      await refresh(session.address);
      setStatus(`Confirmada: ${tx.hash}`);
    } catch (error) {
      const message = VaultClient.formatError(error);
      setStatus(message);
      throw new Error(message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePause(): Promise<void> {
    if (!client || !session) return;
    setBusy(true);
    try {
      const tx = await client.pause();
      await tx.wait();
      await refresh(session.address);
      setStatus("Vault pausado");
    } catch (error) {
      setStatus(VaultClient.formatError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnpause(): Promise<void> {
    if (!client || !session) return;
    setBusy(true);
    try {
      const tx = await client.unpause();
      await tx.wait();
      await refresh(session.address);
      setStatus("Vault reanudado");
    } catch (error) {
      setStatus(VaultClient.formatError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleSetTokenAllowed(token: string, allowed: boolean): Promise<void> {
    if (!client || !session) return;
    setBusy(true);
    try {
      const tx = await client.setTokenAllowed(token, allowed);
      await tx.wait();
      setStatus(allowed ? `Token allowlisted: ${token}` : `Token removido de allowlist: ${token}`);
    } catch (error) {
      setStatus(VaultClient.formatError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleRescueETH(to: string, amount: string): Promise<void> {
    if (!client || !session) return;
    setBusy(true);
    try {
      const tx = await client.rescueETH(to, amount);
      await tx.wait();
      setStatus(`Rescue ETH OK → ${to}`);
    } catch (error) {
      setStatus(VaultClient.formatError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleRescueERC20(token: string, to: string, amount: string): Promise<void> {
    if (!client || !session) return;
    setBusy(true);
    try {
      const tx = await client.rescueERC20(token, to, amount);
      await tx.wait();
      setStatus(`Rescue ERC-20 OK → ${to}`);
    } catch (error) {
      setStatus(VaultClient.formatError(error));
    } finally {
      setBusy(false);
    }
  }

  return {
    config,
    client,
    session,
    walletName,
    selectedAssetId,
    selectedAsset,
    ledgers,
    paused,
    owner,
    status,
    busy,
    setSelectedAssetId,
    handleLoggedIn,
    handleLogout,
    handleAction,
    handlePause,
    handleUnpause,
    handleSetTokenAllowed,
    handleRescueETH,
    handleRescueERC20,
  };
}
