# Architecture — ph-issp-builder

---

## Overview

Two architectures coexist in the codebase. Only the **local-first** one is active and user-facing.

| Architecture | Status | Entry point |
|---|---|---|
| Local-first (IndexedDB) | ✅ Active | `/editor` (public, no auth) |
| Server-side (Prisma + NextAuth) | 🔴 Dormant | `/(dashboard)/` — not linked from UI |

---

## Local-First Architecture (Active)

### Data flow

```
User action → form component → updatePart*() → IDB (debounced 1.5s)
                                             ↓
                                     doc state (React)
                                             ↓
                             saveToFile() → .issp download
                             loadFromFile() ← .issp upload
                             POST /api/export → PDF download
```

### Key files

| File | Role |
|---|---|
| `src/lib/store/index.tsx` | Context provider + all mutations |
| `src/lib/store/types.ts` | All TypeScript types |
| `src/lib/store/defaults.ts` | `createEmptyDocument()`, part factories |
| `src/lib/store/idb.ts` | `idbSave`, `idbLoad`, `idbClear` |
| `src/app/editor/layout.tsx` | Wraps children in `<IsspStoreProvider>` |
| `src/app/editor/page.tsx` | Splash (no doc) or Overview (doc loaded) |
| `src/components/editor/editor-shell.tsx` | `beforeunload` warning; mobile drawer context |
| `src/components/editor/editor-sidebar.tsx` | Nav, file actions, status pill |
| `src/hooks/use-file-save-reminder.ts` | 10-min save reminder |

### Form pages

All 18 form pages are under `src/app/editor/`:

```
part1/a  part1/b  part1/c
part2/a  part2/b  part2/c  part2/d
part3/a  part3/b  part3/c  part3/d  part3/e1  part3/e2  part3/f
part4/year1  part4/year2  part4/year3  part4/summary
```

Form components live in `src/components/issp-editor/`.

---

## PDF Export Pipeline

```
Client: POST /api/export  ← IsspDocument JSON
         ↓
Server: render-issp-html.ts  → full HTML string (A4 landscape, P052 font)
         ↓
        generate-pdf.ts      → Puppeteer (Chrome 148) → PDF buffer
         ↓
        Two-PDF merge (pdf-lib):
          PDF 1: cover page (no header/footer)
          PDF 2: content pages (running header + footer)
         ↓
Client receives merged PDF
```

### PDF key notes

- Font: P052 / URW Palladio (Palatino clone) — install via `apt-get install fonts-urw-base35`
- Chrome path: system Chrome 148 (production server)
- Network/EA diagrams embed as `<img src="data:...">` directly — no baseUrl prefix needed
- TOC page numbers are **static/hardcoded** — no two-pass render yet (known gap)
- Part IV uses `fundSourceAbbr()` helper to shorten fund source labels
- `alpha(n)` generates section letters dynamically (A, B, C...) for project budget headers

### Production server path

PDF render runs on the server. In dev, Puppeteer uses the locally installed Chrome. On prod (`/root/apps/issp`), use the system Chrome.

---

## Theme System

Four themes: `system-light`, `system-dark`, `warm-light`, `warm-dark`.

- Stored in `localStorage` key `issp-theme`
- Applied as class on `<html>`: `.theme-system-light`, `.theme-warm-dark`, etc.
- `dark:` Tailwind variant tied to `.theme-system-dark` / `.theme-warm-dark` (not OS preference)
- SSR flash prevention: inline `<script>` in root layout reads localStorage and sets class before hydration
- Provider: `ThemeProvider` component

---

## Routing & basePath

Next.js `basePath` is `/issp` in production (set in `next.config.ts`).

**Critical:** Never use plain `<a href="...">` for internal navigation — it bypasses `addBasePath()`.
Always use `router.push("...")` from `useRouter()` (`next/navigation`).

UACS JSON: fetch with `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/uacs_active.min.json` — not `/uacs_active.min.json`.

---

## Server-Side Architecture (Dormant)

Preserved but not wired to the local-first UI. Do not modify these files unless intentionally reviving server-side features.

| Component | Location |
|---|---|
| Prisma schema | `prisma/schema.prisma` |
| SQLite DB | `dev.db` (project root) |
| CRUD API routes | `src/app/api/issp/documents/` |
| Auth (NextAuth v5 beta) | `src/lib/auth.ts` |
| Dashboard forms | `src/app/(dashboard)/` |

---

## Middleware

`src/proxy.ts` (Next.js 16 middleware) protects routes. Public allowlist includes:
- `/editor` and all sub-routes
- `/uacs`
- `/api/export`
- `/about`, `/privacy`

If adding a new public route, add it to the middleware allowlist and the matcher exclusion, following the `isEditorRoute` / `isUacsRoute` pattern.

---

## Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router (TypeScript, Turbopack) | 16.2.6 |
| State | IndexedDB via `idb-keyval` | — |
| Database (dormant) | SQLite via Prisma 7 | — |
| Auth (dormant) | NextAuth.js v5 beta | 5.0.0-beta.31 |
| UI | Tailwind CSS 4 + shadcn/ui | 4.x |
| Toasts | Sonner | — |
| Font (display) | Fraunces | `--font-display` |
| Font (UI) | IBM Plex Sans | `--font-sans` |
| Font (mono) | IBM Plex Mono | `--font-mono` |
| Font (PDF) | P052 / URW Palladio | apt package |
| PDF | Puppeteer + pdf-lib | 25.0.2 |
| Confetti | canvas-confetti | — |
