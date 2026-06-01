# Memory Index — ph-issp-builder

Quick-reference table. Read the linked file for details.

| Topic | File | One-liner |
|---|---|---|
| Schema & types | `schema.md` | `IsspDocument` root type, all sub-types, section key map |
| Store API & gotchas | `store.md` | `useIsspStore`, `savedSnapshot`, `migrateLegacyDoc`, `loading` guard |
| Architecture | `architecture.md` | Local-first (active) vs. server-side (dormant), PDF pipeline |
| Deployment | `deployment.md` | pm2 on port 3100, `/issp` basePath, known prod pitfalls |
| Components | `components.md` | UI primitives, form shells, editor components |

## Current Status (as of 2026-05-28)

All 6 phases + Local-First rearchitecture + 8 UI Refresh phases → **COMPLETE**.

Test + CI infrastructure added: vitest unit suite (~75% line coverage of `src/lib`,
floor enforced in `vitest.config.ts`) + GitHub Actions pipeline (`lint`, `typecheck`,
`test`, `build`). Tests live in `src/__tests__/`.

Next planned work:
- **CI `typecheck` job — FIXED & VERIFIED.** Added an explicit `npx prisma generate`
  step before `tsc --noEmit` in the `typecheck` job of `.github/workflows/ci.yml`. This
  generates the gitignored `@/generated/prisma/client`, the single root cause of *both*
  the `db.ts` TS2307 and the `documents/page.tsx` implicit-`any` on `d` (the latter is
  downstream — untyped `db` → `any` `docs`). Mirrors what the `build` job already does.
  Verified locally on Node 22.22.3: `prisma generate` then `tsc --noEmit` → exit 0, clean.
  (Final green-check confirmation still happens in GitHub Actions on push.)
- **Node version requirement now pinned in-repo.** Added `engines.node`
  (`^20.19.0 || ^22.12.0 || >=24.0.0`, mirroring Prisma 7's engine field) to `package.json`
  and a `.nvmrc` pinning `22.22.3` (Active LTS "Jod"). Prisma 7.8.0 needs Node ≥20.19/22.12;
  Node ≤20.12 fails `prisma generate` with `ERR_REQUIRE_ESM` from `@prisma/dev`.
  NOTE: nvm-windows cannot be driven from the agent's non-interactive shell (it emits no
  output and installs nothing when stdio is redirected). Dev-env Node switch must be done
  by the user in an interactive (elevated) terminal: `nvm install 22.22.3 && nvm use 22.22.3`.
- **Dependency posture (assessed 2026-06-01).** Stack tracks the latest-major release
  schedule, not an LTS snapshot: Next 16, React 19, Prisma 7, Tailwind 4, Zod 4, Base UI 1,
  Puppeteer 25, ESLint 9 all current. `next`/`react` are exact-pinned; rest use carets.
  Laggards (upgrade candidates, low risk — dev tooling): TypeScript `^5` (v6 released),
  Vitest `^2` (v4 released). `next-auth` is on a v5 *beta* (stable npm tag still v4) in the
  dormant auth stack — only pre-release dep.
- Section body pattern pass (FormGroup, FieldRow, etc.)
- Pre-export validation
- Annex 1 standalone module (`/annex1`)
- PDF: two-pass TOC page numbers

## Key Constants

| Constant | Value | Location |
|---|---|---|
| `ISSP_START_YEAR` | 2028 | `issp-properties-dialog.tsx` |
| `ISSP_END_YEAR` | 2030 | `issp-properties-dialog.tsx` |
| Coverage period | 2028–2030 (locked per MITHI Resolution 2026-02) | Read-only in UI |
| `schemaVersion` (current) | 3 | `store/index.tsx` |
| IDB debounce | 1 500 ms | `store/index.tsx` `SAVE_DEBOUNCE_MS` |
| Save status flash | 2 000 ms | `store/index.tsx` `SAVED_FLASH_MS` |
| File save reminder | 10 min | `hooks/use-file-save-reminder.ts` |

## Reference Files

| File | Purpose |
|---|---|
| `references/ISSP_Guidelines_2026.md` | Authoritative field names & options — check here first |
| `public/demo/ncwtr-issp-2026-2028.issp` | Demo file; all 4 parts populated |
| `docs/project-status.md` | Full feature/bug history |
| `docs/session-handoff.md` | Deep architectural reference |
| `docs/dev-workflow.md` | Verify-locally → PR → squash-merge runbook (Node 22, CI gates, gotchas) |
