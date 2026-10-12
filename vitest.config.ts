import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // Cinco segundos (el default) se quedan cortos cuando varias pruebas
    // importan rutas pesadas a la vez: el 2026-10-12 la del webhook de WhatsApp
    // se cayó por tiempo pasando sola. Treinta segundos siguen cazando una
    // prueba colgada de verdad (mismo valor que en hub).
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
