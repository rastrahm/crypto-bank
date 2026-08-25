"use client";

import type { JSX } from "react";

import type { SupportedAsset } from "@/lib/config";

/**
 * @description Panel de lectura de saldos y estado del vault.
 * @param {object} props - Datos a mostrar.
 * @param {string} props.vaultAddress - Address del vault.
 * @param {number} props.chainId - Chain id configurada.
 * @param {string | null} props.account - Usuario conectado.
 * @param {SupportedAsset[]} props.assets - Monedas del .env.
 * @param {Record<string, string>} props.ledgers - Saldos por asset.id.
 * @param {boolean} props.paused - Si el vault está pausado.
 * @param {string} props.owner - Owner on-chain.
 * @returns {JSX.Element} Resumen accesible del estado.
 */
export function VaultStatus({
  vaultAddress,
  chainId,
  account,
  assets,
  ledgers,
  paused,
  owner,
}: {
  vaultAddress: string;
  chainId: number;
  account: string | null;
  assets: SupportedAsset[];
  ledgers: Record<string, string>;
  paused: boolean;
  owner: string;
}): JSX.Element {
  return (
    <section
      aria-label="Estado del vault"
      className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Vault</dt>
          <dd className="break-all font-mono text-xs text-zinc-900 dark:text-zinc-100">{vaultAddress}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Chain ID</dt>
          <dd className="text-zinc-900 dark:text-zinc-100">{chainId}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Paused</dt>
          <dd
            aria-label={paused ? "Vault pausado" : "Vault activo"}
            className="text-zinc-900 dark:text-zinc-100"
          >
            {paused ? "Sí" : "No"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Owner</dt>
          <dd className="break-all font-mono text-xs text-zinc-900 dark:text-zinc-100">{owner || "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Cuenta</dt>
          <dd className="break-all font-mono text-xs text-zinc-900 dark:text-zinc-100">{account ?? "—"}</dd>
        </div>
        {assets.map((asset) => (
          <div key={asset.id}>
            <dt className="text-zinc-500 dark:text-zinc-400">Ledger {asset.symbol}</dt>
            <dd
              aria-label={`Saldo ${asset.symbol} en ledger`}
              className="text-zinc-900 dark:text-zinc-100"
            >
              {ledgers[asset.id] ?? "0"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
