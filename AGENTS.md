<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ISSP Guidelines Reference

`references/ISSP_Guidelines_2026.md` is the authoritative source for all ISSP field names, options, and structure. Use it (not the PDFs) when verifying or implementing any form field.

All reference documents are in the `references/` folder:

| File | Description |
|---|---|
| `ISSP_Guidelines_2026.md` | Structured, agent-readable extraction of the DICT 2026 template — primary reference |
| `ISSP Template 2026_v2.pdf` | **Current** official DICT 2026 ISSP template (v2, 2026-06-12; only change from the original: PNPKI internal GSSPD note removed) |
| `[Reference] Revised ISSP Template 2026 043026.pdf` | Official DICT 2026 ISSP template (original PDF, superseded by v2) |
| `[Reference] Agency Guidelines for the REVISED ISSP TEMPLATE 2026 043026.pdf` | Accompanying agency guidelines (original PDF) |
| `[Reference] ANNEX 1 - Existing ICT Resource Inventory.pdf` | Annex 1 — ICT resource inventory format reference |
| `[Reference] ANNEX 2 - Sample Disaster Recovery and Business Continuity Plan.pdf` | Annex 2 — Sample DRBCP format reference |

---

# Memory System

Session context is stored in `.claude/memory/`. Read these files at the start of a session for warm context:

| File | What it covers |
|---|---|
| `.claude/memory/index.md` | Master index, key constants, status summary |
| `.claude/memory/schema.md` | Full `IsspDocument` type tree, section keys, migration history |
| `.claude/memory/store.md` | Store API, `savedSnapshot` gotcha, `loading` guard, `migrateLegacyDoc` |
| `.claude/memory/architecture.md` | Local-first vs dormant server-side, PDF pipeline, theme system, routing |
| `.claude/memory/deployment.md` | pm2, port 3100, basePath `/issp`, production gotchas |
| `.claude/memory/components.md` | All component locations, props, and key usage patterns |

---

# Task Playbooks

## Add a new form field to an existing section

1. **Check the reference first** — open `references/ISSP_Guidelines_2026.md` and verify the field name, type, and valid options.
2. **Add to the type** — update the relevant interface in `src/lib/store/types.ts` (e.g. `Part1Data`).
3. **Add a default value** — update the corresponding factory in `src/lib/store/defaults.ts` (e.g. `makeDefaultPart1()`).
4. **Update `SECTION_FIELDS`** — add the field's `{ key, label }` entry in `src/lib/section-fields.ts` if it should appear in the sidebar diff.
5. **Bump `schemaVersion`** and add a migration step in `migrateLegacyDoc()` in `src/lib/store/index.tsx`.
6. **Update the form component** — add the input in the relevant `partN-x-form.tsx`.
7. **Update the PDF renderer** — add the field to `src/lib/pdf/render-issp-html.ts`.
8. **Update the demo file** — regenerate `public/demo/ncwtr-issp-2026-2028.issp` via `node scripts/export-sample-issp.js`.
9. **Write a test** — add a case to the relevant test file in `src/__tests__/`.
10. **Use the `schema-change` skill** for a complete guided checklist: `/schema-change`.

## Debug a form page crashing on load

1. Check for the **missing `loading` guard**:
   ```tsx
   const { doc, loading } = useIsspStore();
   if (loading) return null;   // ← must come before `if (!doc)`
   if (!doc) redirect("/editor");
   ```
2. Check for **undefined nested objects** — use `makeDefaultPart*()` factories or deep-merge against defaults on mount.
3. Check the browser console for the actual error message.
4. Use the `verifier-web` skill to set up Puppeteer verification: `/verifier-web`.

## Debug PDF export issues

1. Verify the field is being passed in the `IsspDocument` POST body to `/api/export`.
2. Check `src/lib/pdf/render-issp-html.ts` — the field must be rendered in the HTML string.
3. For images: use `d.dataUrl` directly as `<img src>` — do **not** prepend `baseUrl`.
4. For fonts: confirm `fonts-urw-base35` is installed on the server.
5. Run the export locally with `npm run dev` and POST to `http://localhost:3000/api/export`.

## Verify locally and open a PR

See `docs/dev-workflow.md` for the full runbook. Gate order before any PR:

1. **Node ≥ 20.19 / 22 LTS** active (`nvm use` honors `.nvmrc`; Prisma 7 needs it).
2. `npx prisma generate` → `npx tsc --noEmit` → `npm run lint` → `npm test` → `npm run build` — all green (lint must be **0 errors**; build mirrors CI with `NEXT_PUBLIC_BASE_PATH=""`).
3. Commit on a **feature branch** (never `main`); stage files explicitly.
4. Open the PR against **`origin`** `main` (no `gh` CLI — use the GitHub REST API; token needs `Pull requests: write`). PR body = human prose + a ```yaml manifest.
5. **Squash and merge** — the PR body becomes the single commit message.

## Deploy to production

See `.claude/memory/deployment.md` for the full checklist. Critical reminders:
- Run `ss -tlnp | grep 3100` and kill any stale process **before** `pm2 restart`.
- The basePath is `/issp` — all internal links must use `router.push()`, not `<a href>`.

## Add a new public route (middleware)

1. Add a route-check function in `src/proxy.ts` following the `isEditorRoute` / `isUacsRoute` pattern.
2. Add it to the matcher exclusion array.
3. Test that the route loads without redirect to `/login`.

## Run tests

```bash
npm test                  # run all unit tests once
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report
```

Tests live in `src/__tests__/` (~75% line coverage of `src/lib`). Current suites:
- `store/defaults.test.ts` — `createEmptyDocument`, part factories
- `store/migrate.test.ts` — `migrateLegacyDoc`, `docContentHash`
- `lib/section-fields.test.ts` — `SECTION_FIELDS`, `getChangedFields`
- `lib/sections.test.ts` — `computeStatus`, `computePartStatus`, `findContinueTarget`, `PARTS`
- `lib/diagram-upload.test.ts` — `getDiagramUploadError`, `createDiagramId`
- `lib/utils.test.ts` — `cn`
- `pdf/render-issp-html.test.ts` — full demo-doc render via `toRenderData` + `php`/`total`/`sumLines`/`ooLabel` helpers

CI (`.github/workflows/ci.yml`) runs `npm run test:coverage`; `vitest.config.ts` enforces a coverage floor (lines/statements ≥ 70, functions ≥ 80, branches ≥ 70).
Still uncovered (intentionally): `auth*`/`db.ts` (dormant server-side), `theme.tsx` (needs jsdom), `pdf/generate-pdf.ts` (Puppeteer), `store/idb.ts` (excluded).
