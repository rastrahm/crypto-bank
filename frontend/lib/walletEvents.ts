import type { Eip1193Provider } from "ethers";

/** Provider EIP-1193 con API de eventos (MetaMask y compatibles). */
export type Eip1193EventProvider = Eip1193Provider & {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
  off?: (event: string, listener: (...args: unknown[]) => void) => void;
};

export interface WalletEventHandlers {
  onAccountsChanged: (accounts: string[]) => void;
  onChainChanged: (chainId: number) => void;
}

/**
 * Parsea `chainId` de `chainChanged` (hex `0x…` o decimal).
 */
export function parseEip1193ChainId(chainId: string | number): number {
  if (typeof chainId === "number") {
    return chainId;
  }
  const raw = chainId.trim();
  if (raw.startsWith("0x") || raw.startsWith("0X")) {
    return Number.parseInt(raw, 16);
  }
  return Number(raw);
}

/**
 * Suscribe `accountsChanged` y `chainChanged`. Devuelve cleanup idempotente.
 * Si el provider no expone `on`, no-op (cleanup vacío).
 */
export function subscribeWalletEvents(
  provider: Eip1193EventProvider,
  handlers: WalletEventHandlers,
): () => void {
  if (typeof provider.on !== "function") {
    return () => undefined;
  }

  const onAccounts = (...args: unknown[]): void => {
    const accounts = (args[0] as string[] | undefined) ?? [];
    handlers.onAccountsChanged(accounts);
  };

  const onChain = (...args: unknown[]): void => {
    const raw = args[0] as string | number;
    handlers.onChainChanged(parseEip1193ChainId(raw));
  };

  provider.on("accountsChanged", onAccounts);
  provider.on("chainChanged", onChain);

  return () => {
    if (typeof provider.removeListener === "function") {
      provider.removeListener("accountsChanged", onAccounts);
      provider.removeListener("chainChanged", onChain);
      return;
    }
    if (typeof provider.off === "function") {
      provider.off("accountsChanged", onAccounts);
      provider.off("chainChanged", onChain);
    }
  };
}
