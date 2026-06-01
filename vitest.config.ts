import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.{ts,tsx}"],
      exclude: ["src/lib/store/idb.ts"], // IndexedDB — not testable in jsdom
      // Floors sit just under the measured baseline so coverage ratchets up,
      // not down. Raise these as dormant modules (auth, theme, generate-pdf)
      // gain tests.
      thresholds: {
        lines: 70,
        statements: 70,
        functions: 80,
        branches: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
