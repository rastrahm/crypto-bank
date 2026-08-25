import { describe, expect, it, vi } from "vitest";

import { ensureWalletChain, toHexChainId } from "@/lib/chainSwitch";
import type { Eip1193Provider } from "ethers";

describe("toHexChainId", () => {
  it("formatea chainId", () => {
    expect(toHexChainId(31337)).toBe("0x7a69");
    expect(toHexChainId(1)).toBe("0x1");
  });
});

describe("ensureWalletChain", () => {
  it("hace switch si la red ya está", async () => {
    const request = vi.fn().mockResolvedValue(null);
    await ensureWalletChain({ request } as Eip1193Provider, 31337, "http://127.0.0.1:8545");
    expect(request).toHaveBeenCalledWith({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x7a69" }],
    });
  });

  it("agrega la red si switch falla con 4902", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce({ code: 4902 })
      .mockResolvedValueOnce(null);
    await ensureWalletChain({ request } as Eip1193Provider, 31337, "http://127.0.0.1:8545");
    expect(request).toHaveBeenNthCalledWith(2, {
      method: "wallet_addEthereumChain",
      params: [
        expect.objectContaining({
          chainId: "0x7a69",
          chainName: "Anvil Local",
          rpcUrls: ["http://127.0.0.1:8545"],
        }),
      ],
    });
  });
});
