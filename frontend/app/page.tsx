import type { JSX } from "react";
import { VaultDashboard } from "@/components/VaultDashboard";

/**
 * @description Página principal de la demo del vault (App Router).
 * @returns {JSX.Element} Dashboard cliente embebido en layout servidor.
 */
export default function HomePage(): JSX.Element {
  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <VaultDashboard />
    </main>
  );
}
