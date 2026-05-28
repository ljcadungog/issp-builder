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
- **CI: fix the `typecheck` job (not yet green).** It runs `npm ci --ignore-scripts`
  (skips the `prisma generate` postinstall) then `tsc --noEmit`, which fails because
  `src/lib/db.ts` imports the ungenerated `@/generated/prisma/client`. Also fix the
  implicit-`any` on `d` in `src/app/(dashboard)/dashboard/documents/page.tsx:16`.
  Options: add a `prisma generate` step to the job / drop `--ignore-scripts` there /
  exclude dormant server-side files from typecheck. (db.ts + that page are part of the
  dormant server-side stack — confirm the intended approach fits.)
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
