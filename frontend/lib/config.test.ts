import { describe, expect, it } from "vitest";

import { parseAssetsEnv } from "@/lib/config";

describe("parseAssetsEnv", () => {
  it("parsea ETH nativo y ERC-20 con decimals default 18", () => {
    const assets = parseAssetsEnv("ETH:native,mUSD:0x5FbDB2315678afecb367f032d93F642f64180aa3");
    expect(assets).toHaveLength(2);
    expect(assets[0]).toMatchObject({ id: "ETH", kind: "native", address: null, decimals: 18 });
    expect(assets[1]).toMatchObject({
      id: "mUSD",
      kind: "erc20",
      address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      decimals: 18,
    });
  });

  it("acepta decimals explícitos", () => {
    const assets = parseAssetsEnv("USDC:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48:6");
    expect(assets[0]).toMatchObject({ id: "USDC", decimals: 6, kind: "erc20" });
  });

  it("rechaza address inválida", () => {
    expect(() => parseAssetsEnv("USDC:0x123")).toThrow(/Address inválida/);
  });

  it("rechaza decimals inválidos", () => {
    expect(() => parseAssetsEnv("USDC:0x5FbDB2315678afecb367f032d93F642f64180aa3:99x")).toThrow(
      /Decimales inválidos/,
    );
  });
});
