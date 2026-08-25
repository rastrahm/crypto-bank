import { z } from "zod";

/**
 * Schema Zod para montos decimales positivos (human-readable; decimals del asset en config).
 */
export const amountSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un monto")
  .regex(/^\d+(\.\d+)?$/, "Formato inválido")
  .refine((value) => Number(value) > 0, "El monto debe ser mayor que 0");

/**
 * @description Schema Zod para address Ethereum.
 */
export const addressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Address inválida");

export type AmountInput = z.infer<typeof amountSchema>;

/**
 * @description Valida un monto de formulario.
 * @param {string} raw - Valor del input.
 * @returns {{ success: true; data: string } | { success: false; error: string }}
 */
export function parseAmount(raw: string): { success: true; data: string } | { success: false; error: string } {
  const result = amountSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Monto inválido" };
  }
  return { success: true, data: result.data };
}
