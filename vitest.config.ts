import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.{ts,tsx}"],
      exclude: ["src/lib/store/idb.ts"], // IndexedDB — no DOM in the node environment
      // Floors sit just under the measured baseline so coverage ratchets up,
      // not down. Raise these as dormant modules (theme, usage-log,
      // generate-pdf) gain tests.
      //
      // Re-baselined for vitest 4: the v8 provider now remaps coverage through
      // an AST instead of v8-to-istanbul, which counts far fewer lines as
      // coverable and attributes them much more strictly. The same suite that
      // measured 59.23/75.56/73.43/59.23 under vitest 2 measures
      // 43.05/46.02/52.32/44.21 here. No tests were lost — only the
      // accounting changed.
      thresholds: {
        lines: 44,
        statements: 43,
        functions: 52,
        branches: 46,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
