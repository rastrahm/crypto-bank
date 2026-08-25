import type { JSX } from "react";

/**
 * @description Página 404 de la demo.
 * @returns {JSX.Element} Mensaje de recurso no encontrado.
 */
export default function NotFoundPage(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-2 p-6">
      <h1 className="text-xl font-semibold">No encontrado</h1>
      <p className="text-sm text-zinc-600">La ruta solicitada no existe en la demo del vault.</p>
    </main>
  );
}
