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
      // Structurally untestable under `environment: "node"` — excluded so the
      // percentages measure code we could actually cover. Anything merely
      // *untested* (record-usage, usage-log, seo) stays in the denominator on
      // purpose, so the floors keep applying pressure to it.
      exclude: [
        "src/lib/store/idb.ts",      // IndexedDB — no DOM in the node environment
        "src/lib/theme.tsx",         // reads document/localStorage on import
        "src/lib/reveal.ts",         // requestAnimationFrame + document + CSS.escape
        "src/lib/pdf/generate-pdf.ts", // drives Puppeteer against a real browser
        "src/lib/annex1/types.ts",   // type declarations only — no executable statements
      ],
      // Floors sit just under the measured baseline so coverage ratchets up,
      // not down. Raise these as dormant modules (theme, usage-log,
      // generate-pdf) gain tests.
      //
      // Re-baselined for vitest 4: the v8 provider now remaps coverage through
      // an AST instead of v8-to-istanbul, which counts far fewer lines as
      // coverable and attributes them much more strictly. The same suite that
      // measured 59.23/75.56/73.43/59.23 under vitest 2 measures
      // 43.05/46.02/52.32/44.21 here. No tests were lost — only the
      // accounting changed. Narrowing `exclude` to the code we can actually
      // reach then brought the same suite to 52.65/50.68/59.50/54.01.
      thresholds: {
        lines: 54,
        statements: 52,
        functions: 59,
        branches: 50,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
