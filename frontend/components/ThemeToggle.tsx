"use client";

import { useEffect, useState, type JSX } from "react";

type Theme = "light" | "dark";

/**
 * @description Alterna modo claro/oscuro y persiste la preferencia.
 * @returns {JSX.Element} Botón de tema.
 */
export function ThemeToggle(): JSX.Element {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("crypto-bank.theme") as Theme | null;
    const initial: Theme = stored === "light" || stored === "dark" ? stored : "dark";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  /**
   * @description Cambia el tema y lo guarda en localStorage.
   * @returns {void}
   */
  function toggle(): void {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem("crypto-bank.theme", next);
  }

  return (
    <button
      type="button"
      aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
      onClick={toggle}
      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
    >
      {theme === "dark" ? "Claro" : "Oscuro"}
    </button>
  );
}
