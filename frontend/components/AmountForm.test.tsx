import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AmountForm } from "@/components/AmountForm";
import { AssetSelect } from "@/components/AssetSelect";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { SupportedAsset } from "@/lib/config";

const assets: SupportedAsset[] = [
  { id: "ETH", symbol: "ETH", kind: "native", address: null, decimals: 18 },
  {
    id: "mUSD",
    symbol: "mUSD",
    kind: "erc20",
    address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    decimals: 18,
  },
];

describe("AssetSelect", () => {
  it("permite elegir moneda por rol combobox/select", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AssetSelect assets={assets} value="ETH" onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText(/seleccionar moneda/i), "mUSD");
    expect(onChange).toHaveBeenCalledWith("mUSD");
  });
});

describe("ThemeToggle", () => {
  it("alterna el label accesible de tema", async () => {
    const user = userEvent.setup();
    document.documentElement.classList.add("dark");
    window.localStorage.setItem("crypto-bank.theme", "dark");
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /activar modo claro/i });
    await user.click(btn);
    expect(screen.getByRole("button", { name: /activar modo oscuro/i })).toBeInTheDocument();
  });
});

describe("AmountForm", () => {
  it("muestra error de validación Zod sin llamar onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AmountForm
        title="Depositar ETH"
        actionLabel="Depositar ETH"
        op="deposit"
        assetSymbol="ETH"
        disabled={false}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/monto para depositar eth/i), "0");
    await user.click(screen.getByRole("button", { name: /depositar eth/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("envía monto válido al handler", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <AmountForm
        title="Retirar mUSD"
        actionLabel="Retirar mUSD"
        op="withdraw"
        assetSymbol="mUSD"
        disabled={false}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/monto para retirar musd/i), "1.25");
    await user.click(screen.getByRole("button", { name: /retirar musd/i }));

    expect(onSubmit).toHaveBeenCalledWith("withdraw", "1.25");
  });
});
