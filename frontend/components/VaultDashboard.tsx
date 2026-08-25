"use client";

import type { JSX } from "react";

import { AdminPanel } from "@/components/AdminPanel";
import { AmountForm } from "@/components/AmountForm";
import { AssetSelect } from "@/components/AssetSelect";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VaultStatus } from "@/components/VaultStatus";
import { WalletLogin } from "@/components/WalletLogin";
import { useVaultApp } from "@/hooks/useVaultApp";

/** Shell UI: login, select de moneda y operaciones del vault. */
export function VaultDashboard(): JSX.Element {
  const {
    config,
    client,
    session,
    walletName,
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
  } = useVaultApp();

  if (!config || !client || !selectedAsset) {
    return (
      <p
        role="alert"
        className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
      >
        Falta configuración. Definí <code>NEXT_PUBLIC_ASSETS</code> en <code>.env.local</code> (ver{" "}
        <code>.env.example</code>).
      </p>
    );
  }

  const account = session?.address ?? null;
  const isOwner = Boolean(account && owner && account.toLowerCase() === owner.toLowerCase());
  const opsDisabled = busy || !session || paused;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Crypto Bank Vault</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Demo Next.js + ethers.js v6</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session ? (
            <button
              type="button"
              aria-label="Cerrar sesión"
              disabled={busy}
              onClick={handleLogout}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              Salir ({walletName ?? "wallet"})
            </button>
          ) : null}
        </div>
      </header>

      {!session ? (
        <WalletLogin chainId={config.chainId} rpcUrl={config.rpcUrl} onLoggedIn={handleLoggedIn} />
      ) : (
        <>
          <VaultStatus
            vaultAddress={config.vaultAddress}
            chainId={config.chainId}
            account={account}
            assets={config.assets}
            ledgers={ledgers}
            paused={paused}
            owner={owner}
          />

          <section
            aria-label="Operaciones"
            className="rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <AssetSelect
              assets={config.assets}
              value={selectedAsset.id}
              onChange={setSelectedAssetId}
              disabled={busy}
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <AmountForm
                title={`Depositar ${selectedAsset.symbol}`}
                actionLabel={`Depositar ${selectedAsset.symbol}`}
                op="deposit"
                assetSymbol={selectedAsset.symbol}
                disabled={opsDisabled}
                onSubmit={handleAction}
              />
              <AmountForm
                title={`Retirar ${selectedAsset.symbol}`}
                actionLabel={`Retirar ${selectedAsset.symbol}`}
                op="withdraw"
                assetSymbol={selectedAsset.symbol}
                disabled={opsDisabled}
                onSubmit={handleAction}
              />
            </div>
          </section>

          {status ? (
            <p
              role="status"
              className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {status}
            </p>
          ) : null}

          <AdminPanel
            visible={isOwner}
            paused={paused}
            busy={busy}
            account={account}
            onPause={handlePause}
            onUnpause={handleUnpause}
            onSetTokenAllowed={handleSetTokenAllowed}
            onRescueETH={handleRescueETH}
            onRescueERC20={handleRescueERC20}
          />
        </>
      )}
    </div>
  );
}
