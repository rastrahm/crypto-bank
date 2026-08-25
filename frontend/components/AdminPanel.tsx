"use client";

import { useState, type JSX } from "react";

/**
 * @description Controles de emergencia, allowlist y rescue para el owner.
 */
export function AdminPanel({
  visible,
  paused,
  busy,
  account,
  onPause,
  onUnpause,
  onSetTokenAllowed,
  onRescueETH,
  onRescueERC20,
}: {
  visible: boolean;
  paused: boolean;
  busy: boolean;
  account: string | null;
  onPause: () => Promise<void>;
  onUnpause: () => Promise<void>;
  onSetTokenAllowed: (token: string, allowed: boolean) => Promise<void>;
  onRescueETH: (to: string, amount: string) => Promise<void>;
  onRescueERC20: (token: string, to: string, amount: string) => Promise<void>;
}): JSX.Element | null {
  const [tokenInput, setTokenInput] = useState("");
  const [rescueToken, setRescueToken] = useState("");
  const [rescueAmount, setRescueAmount] = useState("");

  if (!visible) {
    return null;
  }

  async function applyAllowlist(allowed: boolean): Promise<void> {
    const token = tokenInput.trim();
    if (!token) return;
    await onSetTokenAllowed(token, allowed);
  }

  async function applyRescue(): Promise<void> {
    if (!account || !rescueAmount.trim()) return;
    const token = rescueToken.trim();
    if (token) {
      await onRescueERC20(token, account, rescueAmount.trim());
    } else {
      await onRescueETH(account, rescueAmount.trim());
    }
  }

  return (
    <section
      aria-label="Panel admin"
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950"
    >
      <h3 className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-200">Admin (owner)</h3>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-label="Pausar vault"
          disabled={busy || paused}
          onClick={() => void onPause()}
          className="rounded-md bg-amber-800 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Pausar
        </button>
        <button
          type="button"
          aria-label="Reanudar vault"
          disabled={busy || !paused}
          onClick={() => void onUnpause()}
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Unpause
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm text-amber-950 dark:text-amber-100">
          Token ERC-20 (allowlist)
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="0x…"
            disabled={busy}
            spellCheck={false}
            className="rounded-md border border-amber-400 bg-white px-3 py-2 font-mono text-sm dark:border-amber-600 dark:bg-zinc-900"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || !tokenInput.trim()}
            onClick={() => void applyAllowlist(true)}
            className="rounded-md bg-emerald-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Allow
          </button>
          <button
            type="button"
            disabled={busy || !tokenInput.trim()}
            onClick={() => void applyAllowlist(false)}
            className="rounded-md bg-zinc-700 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3 sm:items-end">
        <label className="flex flex-col gap-1 text-sm text-amber-950 dark:text-amber-100">
          Rescue token (vacío = ETH)
          <input
            type="text"
            value={rescueToken}
            onChange={(e) => setRescueToken(e.target.value)}
            placeholder="0x… o vacío"
            disabled={busy}
            spellCheck={false}
            className="rounded-md border border-amber-400 bg-white px-3 py-2 font-mono text-sm dark:border-amber-600 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-amber-950 dark:text-amber-100">
          Monto (surplus)
          <input
            type="text"
            value={rescueAmount}
            onChange={(e) => setRescueAmount(e.target.value)}
            placeholder="0.0"
            disabled={busy}
            className="rounded-md border border-amber-400 bg-white px-3 py-2 text-sm dark:border-amber-600 dark:bg-zinc-900"
          />
        </label>
        <button
          type="button"
          disabled={busy || !rescueAmount.trim() || !account}
          onClick={() => void applyRescue()}
          className="rounded-md bg-amber-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Rescue → owner
        </button>
      </div>
    </section>
  );
}
