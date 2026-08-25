"use client";

import { useState, type FormEvent, type JSX } from "react";

import { parseAmount } from "@/lib/schemas";

export type VaultOp = "deposit" | "withdraw";

/**
 * @description Formulario de monto para depositar o retirar el activo seleccionado.
 * @param {object} props - Props del formulario.
 * @param {string} props.title - Título visible.
 * @param {string} props.actionLabel - Texto del botón submit.
 * @param {VaultOp} props.op - Operación (deposit/withdraw).
 * @param {string} props.assetSymbol - Símbolo de la moneda elegida.
 * @param {boolean} props.disabled - Deshabilita el form.
 * @param {(op: VaultOp, amount: string) => Promise<void>} props.onSubmit - Envío validado.
 * @returns {JSX.Element} Formulario accesible.
 */
export function AmountForm({
  title,
  actionLabel,
  op,
  assetSymbol,
  disabled,
  onSubmit,
}: {
  title: string;
  actionLabel: string;
  op: VaultOp;
  assetSymbol: string;
  disabled: boolean;
  onSubmit: (op: VaultOp, amount: string) => Promise<void>;
}): JSX.Element {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /**
   * @description Valida con Zod y dispara la acción del vault.
   * @param {FormEvent<HTMLFormElement>} event - Submit del form.
   * @returns {Promise<void>}
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const parsed = parseAmount(amount);
    if (!parsed.success) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setPending(true);
    try {
      await onSubmit(op, parsed.data);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error en la transacción");
    } finally {
      setPending(false);
    }
  }

  const inputId = `amount-${op}`;

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      aria-label={title}
      className="flex flex-col gap-2 rounded-lg border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      <label htmlFor={inputId} className="text-xs text-zinc-600 dark:text-zinc-400">
        Monto ({assetSymbol})
      </label>
      <input
        id={inputId}
        name="amount"
        inputMode="decimal"
        placeholder="0.0"
        aria-label={`Monto para ${title}`}
        value={amount}
        disabled={disabled || pending}
        onChange={(e) => setAmount(e.target.value)}
        className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
      />
      {error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={disabled || pending}
        className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-emerald-700"
      >
        {pending ? "Confirmando…" : actionLabel}
      </button>
    </form>
  );
}
