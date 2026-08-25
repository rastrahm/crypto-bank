import { Wallet, hexlify, randomBytes } from "ethers";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildLoginMessage,
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  verifyAuthSession,
  type AuthSession,
} from "@/lib/authSession";

/** Wallet de prueba (evita Wallet.createRandom + Buffer de Node bajo jsdom). */
function testWallet(): Wallet {
  return new Wallet(hexlify(randomBytes(32)));
}

describe("verifyAuthSession", () => {
  it("acepta firma válida y rechaza manipulación", async () => {
    const wallet = testWallet();
    const message = buildLoginMessage(wallet.address, "MetaMask", 31337);
    const signature = await wallet.signMessage(message);
    const session: AuthSession = {
      address: wallet.address,
      walletRdns: "io.metamask",
      walletName: "MetaMask",
      signature,
      message,
      loggedAt: Date.now(),
    };
    expect(verifyAuthSession(session)).toBe(true);
    expect(verifyAuthSession({ ...session, address: testWallet().address })).toBe(false);
    expect(verifyAuthSession({ ...session, signature: "0x00" })).toBe(false);
  });
});

describe("loadAuthSession / saveAuthSession", () => {
  afterEach(() => {
    clearAuthSession();
  });

  it("persiste solo sesiones con firma válida", async () => {
    const wallet = testWallet();
    const message = buildLoginMessage(wallet.address, "Phantom", 31337);
    const signature = await wallet.signMessage(message);
    const session: AuthSession = {
      address: wallet.address,
      walletRdns: "app.phantom",
      walletName: "Phantom",
      signature,
      message,
      loggedAt: Date.now(),
    };
    saveAuthSession(session);
    const loaded = loadAuthSession();
    expect(loaded?.address).toBe(wallet.address);

    window.localStorage.setItem(
      "crypto-bank.auth.v1",
      JSON.stringify({ ...session, address: testWallet().address }),
    );
    expect(loadAuthSession()).toBeNull();
  });
});
