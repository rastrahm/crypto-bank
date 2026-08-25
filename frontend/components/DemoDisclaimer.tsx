import type { JSX } from "react";

/** Aviso fijo: demo de prueba — no usar wallets con valor real. */
export function DemoDisclaimer(): JSX.Element {
  return (
    <aside
      role="note"
      aria-label="Aviso de versión de prueba"
      className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100"
    >
      <p className="font-medium">Versión de prueba</p>
      <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
        Esta es una demostración educativa.{" "}
        <strong>No uses una wallet con fondos reales</strong> ni conectes cuentas de mainnet con
        valor. Usá solo redes de prueba y cuentas sin valor económico.{" "}
        <a
          href="/ayuda.html"
          className="font-medium underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-50"
        >
          Ver manual de ayuda
        </a>
      </p>
    </aside>
  );
}
