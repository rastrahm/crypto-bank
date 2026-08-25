import { describe, expect, it } from "vitest";

import { parseAmount } from "@/lib/schemas";

describe("parseAmount", () => {
  it("acepta montos decimales positivos", () => {
    expect(parseAmount("1.5")).toEqual({ success: true, data: "1.5" });
  });

  it("rechaza vacío", () => {
    const result = parseAmount("");
    expect(result.success).toBe(false);
  });

  it("rechaza cero", () => {
    const result = parseAmount("0");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/mayor que 0/i);
    }
  });

  it("rechaza texto", () => {
    const result = parseAmount("abc");
    expect(result.success).toBe(false);
  });
});
