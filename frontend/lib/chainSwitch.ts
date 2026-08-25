import type { Eip1193Provider } from "ethers";

/** Error tipado de providers EIP-1193 (MetaMask, etc.). */
interface Eip1193Error {
  code?: number | string;
  message?: string;
  data?: unknown;
}

/**
 * Hex chainId para `wallet_switchEthereumChain` (`31337` → `0x7a69`).
 */
export function toHexChainId(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}

/**
 * Intenta `wallet_switchEthereumChain`; si la red no existe (4902), hace `wallet_addEthereumChain`.
 */
export async function ensureWalletChain(
  ethereum: Eip1193Provider,
  chainId: number,
  rpcUrl: string,
  chainName = `Chain ${chainId}`,
): Promise<void> {
  const hexChainId = toHexChainId(chainId);
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });
    return;
  } catch (error: unknown) {
    const code = (error as Eip1193Error)?.code;
    const nested = (error as { error?: Eip1193Error })?.error?.code;
    const needsAdd = code === 4902 || nested === 4902 || code === "4902";
    if (!needsAdd) {
      throw error instanceof Error ? error : new Error(String((error as Eip1193Error)?.message ?? error));
    }
  }

  await ethereum.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: hexChainId,
        chainName: chainId === 31337 ? "Anvil Local" : chainName,
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: [rpcUrl],
      },
    ],
  });
}
