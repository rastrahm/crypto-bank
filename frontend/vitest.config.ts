import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Sin `@vitejs/plugin-react`: su Vite/rolldown choca con el Vite de Vitest 3.
 * JSX: esbuild `jsx: "automatic"` + `vitest.setup.ts`.
 */
export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});
