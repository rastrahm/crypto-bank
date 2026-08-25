"use client";

import type { ChangeEvent, JSX } from "react";

import type { SupportedAsset } from "@/lib/config";

/**
 * @description Select de monedas soportadas (lista desde .env).
 * @param {object} props - Props del select.
 * @param {SupportedAsset[]} props.assets - Activos disponibles.
 * @param {string} props.value - `asset.id` seleccionado.
 * @param {(assetId: string) => void} props.onChange - Cambio de selección.
 * @param {boolean} props.disabled - Deshabilita el control.
 * @returns {JSX.Element} Combo accesible de activos.
 */
export function AssetSelect({
  assets,
  value,
  onChange,
  disabled,
}: {
  assets: SupportedAsset[];
  value: string;
  onChange: (assetId: string) => void;
  disabled?: boolean;
}): JSX.Element {
  /**
   * @description Propaga el id elegido al padre.
   * @param {ChangeEvent<HTMLSelectElement>} event - Cambio del select.
   * @returns {void}
   */
  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    onChange(event.target.value);
  }

  const selected = assets.find((a) => a.id === value);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="asset-select" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Moneda
      </label>
      <select
        id="asset-select"
        aria-label="Seleccionar moneda"
        value={value}
        disabled={disabled}
        onChange={handleChange}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
      >
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.symbol}
            {asset.kind === "native" ? " (nativo)" : " (ERC-20)"}
            {` · ${asset.decimals} dec`}
          </option>
        ))}
      </select>
      {selected?.address ? (
        <p className="break-all font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{selected.address}</p>
      ) : (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">ETH nativo del vault</p>
      )}
    </div>
  );
}
