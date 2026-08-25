import { describe, expect, it, vi } from "vitest";

import {
  parseEip1193ChainId,
  subscribeWalletEvents,
  type Eip1193EventProvider,
} from "@/lib/walletEvents";

describe("parseEip1193ChainId", () => {
  it("parsea hex y decimal", () => {
    expect(parseEip1193ChainId("0x7a69")).toBe(31337);
    expect(parseEip1193ChainId("31337")).toBe(31337);
    expect(parseEip1193ChainId(31337)).toBe(31337);
  });
});

describe("subscribeWalletEvents", () => {
  it("registra y limpia listeners", () => {
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const provider: Eip1193EventProvider = {
      request: vi.fn(),
      on: (event, listener) => {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(listener);
      },
      removeListener: (event, listener) => {
        listeners.get(event)?.delete(listener);
      },
    };

    const onAccountsChanged = vi.fn();
    const onChainChanged = vi.fn();
    const unsub = subscribeWalletEvents(provider, { onAccountsChanged, onChainChanged });

    expect(listeners.get("accountsChanged")?.size).toBe(1);
    expect(listeners.get("chainChanged")?.size).toBe(1);

    for (const fn of listeners.get("accountsChanged")!) {
      fn(["0xAbc"]);
    }
    for (const fn of listeners.get("chainChanged")!) {
      fn("0x7a69");
    }

    expect(onAccountsChanged).toHaveBeenCalledWith(["0xAbc"]);
    expect(onChainChanged).toHaveBeenCalledWith(31337);

    unsub();
    expect(listeners.get("accountsChanged")?.size).toBe(0);
    expect(listeners.get("chainChanged")?.size).toBe(0);
  });

  it("no-op si el provider no tiene on", () => {
    const unsub = subscribeWalletEvents({ request: vi.fn() } as Eip1193EventProvider, {
      onAccountsChanged: vi.fn(),
      onChainChanged: vi.fn(),
    });
    expect(() => unsub()).not.toThrow();
  });
});
