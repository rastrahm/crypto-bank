import { describe, expect, it } from "vitest";

import { buildLoginMessage } from "@/lib/authSession";
import { prioritizeTestWallets, type DiscoveredWallet } from "@/lib/wallets";
import type { Eip1193Provider } from "ethers";

const fakeProvider = {} as Eip1193Provider;

describe("buildLoginMessage", () => {
  it("incluye address, wallet y chainId", () => {
    const msg = buildLoginMessage("0xabc", "MetaMask", 31337);
    expect(msg).toContain("Address: 0xabc");
    expect(msg).toContain("Wallet: MetaMask");
    expect(msg).toContain("Chain ID: 31337");
    expect(msg).toContain("Crypto Bank Vault — Login");
  });
});

describe("prioritizeTestWallets", () => {
  it("ordena MetaMask, Phantom y Solflare primero", () => {
    const wallets: DiscoveredWallet[] = [
      { uuid: "3", name: "Otra", rdns: "com.other", provider: fakeProvider },
      { uuid: "2", name: "Solflare", rdns: "com.solflare", provider: fakeProvider },
      { uuid: "1", name: "MetaMask", rdns: "io.metamask", provider: fakeProvider },
      { uuid: "4", name: "Phantom", rdns: "app.phantom", provider: fakeProvider },
    ];
    const ordered = prioritizeTestWallets(wallets).map((w) => w.rdns);
    expect(ordered.slice(0, 3)).toEqual(["io.metamask", "app.phantom", "com.solflare"]);
  });
});
