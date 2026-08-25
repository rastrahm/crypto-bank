"use client";

import type { JSX } from "react";

/**
 * @description UI de error de ruta para fallos de render.
 * @param {object} props - Props de error.tsx.
 * @param {Error & { digest?: string }} props.error - Error capturado.
 * @param {() => void} props.reset - Reintento de render.
 * @returns {JSX.Element} Pantalla de error.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">Algo salió mal</h1>
      <p role="alert" className="text-sm text-zinc-700">
        {error.message}
      </p>
      <button
        type="button"
        aria-label="Reintentar"
        onClick={reset}
        className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
      >
        Reintentar
      </button>
    </main>
  );
}
