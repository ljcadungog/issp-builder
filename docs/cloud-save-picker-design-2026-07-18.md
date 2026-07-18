# Cloud save/resume via Google Drive / OneDrive file picker

**Date:** 2026-07-18
**Status:** Proposed — for discussion with Carlos before implementation
**Author:** Lance (this branch), drafted to sync with upstream before diverging

## Problem

Local-first (`docs/privacy-architecture.md`) solved the "we shouldn't hold agency
data" problem, but it traded that for a UX problem: the `.issp` file is the only
durable save, and it lives wherever the user's downloads folder happens to be.
Government users lose files, forget where they saved them, or work across a
desktop and a laptop without an easy way to keep the same file in sync.

The ask: let a user optionally link their own Google Drive or OneDrive so
"Save" and "Open" can read/write an `.issp` file in *their* cloud storage,
the way starrailstation.com and similar tools do — save/resume, not
real-time collaboration.

The concern driving this doc: does this require reviving the dormant
NextAuth + Prisma stack (`src/lib/auth.ts`, `prisma/schema.prisma`), and if
so, does that undo the local-first privacy posture that's already been
decided and written up? Short answer: **no** — this can be built entirely as
a client-side extension of the existing file-based save/load flow, without
touching auth, sessions, or the server at all.

## Relationship to `privacy-architecture.md`

This proposal is additive, not a revision of that doc's resolved decisions.
Checked line by line:

| Resolved decision (privacy-architecture.md) | Still holds? |
|---|---|
| No sign-in required | Yes — cloud save is opt-in per action, no app-level account, no session |
| No server database | Yes — no document content ever touches our server |
| Agency identity anonymous / no server-side identity | Yes — the OAuth token identifies the user to *Google/Microsoft*, never to us |
| One active document in IndexedDB at a time | Unchanged — cloud file is just another load/save target, same as local disk |
| `.issp` file format | Unchanged — same JSON envelope, same `fileType`/`version` fields |
| Server remains "static file host, PDF renderer, small usage logger" | Unchanged — no new server routes, no new server-held secrets |

The one open question this doc *does* touch is Q4 in that file
("Collaboration... optional collaboration mode that requires opt-in account
creation"). This proposal is explicitly **not** that — it's single-user
save/resume to a drive the user already owns, not shared editing.

## Why the picker approach, not NextAuth

Two ways to get from "user has a Google/Microsoft account" to "app can read
and write one file":

1. **Full OAuth via our server** (NextAuth, refresh tokens stored server-side,
   silent background sync). This is what the dormant `/(dashboard)/` stack
   was built for. It requires: a token store (that's the Prisma DB coming
   back), a session model, a privacy/PIA rewrite (we'd be holding OAuth
   refresh tokens — arguably more sensitive than the ISSP data itself), and
   a VAPT scope expansion. This is the option that *would* conflict with the
   local-first ADR.

2. **Client-side picker + drive.file scope** (Google Picker API + Google
   Identity Services token client; OneDrive file picker + MSAL.js implicit
   flow). The browser gets a short-lived, narrowly-scoped access token
   directly from Google/Microsoft. It's held in memory (or `sessionStorage`
   at most), used to call the Drive/Graph REST API directly from the
   browser, and discarded when the tab closes. **Our server never sees the
   token, never sees the file content, never stores anything.**

Recommendation: **(2)**. It's the only option that doesn't reopen the
questions `privacy-architecture.md` already closed.

### What `drive.file` / OneDrive file-picker scoping actually grants

- **Google `drive.file` scope**: the app can only see/read/write files the
  user explicitly picked or created through the app's own picker — not the
  user's whole Drive. This is Google's narrowest non-sensitive scope and
  does not require Google's OAuth verification/CASA security assessment the
  way broader Drive scopes do.
- **OneDrive/Graph file picker**: similarly, the picker flow scopes access to
  the files the user selects (`Files.ReadWrite` on the picked item via the
  picker's own consent, not app-wide `Files.ReadWrite.All`).

Both models mean: no admin consent screen, no "this app can see your entire
Drive" warning, and no server-side credential to protect.

## Proposed UX

Mirrors the existing "Save to File" / "Load from File" entry points
(`docs/privacy-architecture.md` §3, Layer 2) rather than replacing them:

- **Editor header / sidebar**: existing "Save to File" button gets a
  secondary option — "Save to Google Drive" / "Save to OneDrive" — opening
  the provider's picker/save-as dialog. Same for "Load from File" gaining
  "Open from Google Drive" / "Open from OneDrive".
- **Landing page**: "Load from File" step gains the same two cloud options
  alongside the existing local-file input.
- No new persistent UI chrome, no "connect your account" settings page, no
  background sync indicator — each save/open is a one-shot user-initiated
  action, consistent with the file-based mental model users already have.
- The unsaved-changes reminder system (Layers 3–6 in
  `privacy-architecture.md`) is unchanged; a cloud save satisfies the "saved"
  state exactly like a local file download does.

## Data flow

```
User's browser (IndexedDB, in-memory doc state)
    → [Save to Drive/OneDrive] → provider's picker (user grants file-scoped access)
                                → browser calls Drive/Graph REST API directly
                                → .issp JSON written to the picked/created file
                                → done — no request to our server

    → [Open from Drive/OneDrive] → provider's picker (user selects a file)
                                  → browser fetches file content directly from provider
                                  → JSON parsed into IndexedDB, same as local file load
```

No new server endpoint. `/api/export` (PDF) and `/api/usage` are untouched.

## Implementation sketch

- **Google**: Google Identity Services (`accounts.google.com/gsi/client`) for
  the OAuth token client (`drive.file` scope) + Google Picker API
  (`apis.google.com/js/api.js`) for the file picker. Both are loaded as
  external `<script>` tags only when the user clicks a Drive option — not
  bundled, not loaded on every page view.
- **Microsoft**: OneDrive file picker (`js/live/v7.2/OneDrive.js`) for
  picking/creating a file; `Files.ReadWrite` scope granted per-picker-session
  the same way.
- File read/write itself: plain `fetch()` calls to
  `www.googleapis.com/upload/drive/v3/files` and
  `graph.microsoft.com/v1.0/me/drive/items/{id}/content` with the
  short-lived access token in the `Authorization` header. No SDK required
  beyond the picker.
- Client keeps the access token in memory only (a React ref/state, not
  `localStorage`) — it's discarded on tab close or after ~1 hour token
  expiry, consistent with never treating it as a durable credential.
- Requires a Google Cloud project (OAuth client ID) and an Azure app
  registration (MSAL app ID) — both are public client IDs meant to ship in
  frontend code; no client secret involved for either flow.

## Explicitly out of scope

- Silent/background autosave to cloud storage (would require refresh tokens
  and therefore a server-side token store — this is exactly the NextAuth
  path we're deliberately avoiding).
- Real-time multi-user collaboration.
- Any new server route, database table, or session concept.
- Account linking / "connect your Google account to your ISSP Builder
  profile" — there is no ISSP Builder profile to link to.
- Dropbox, Box, or other providers — Drive/OneDrive cover the realistic
  Philippine government-agency device split (Google Workspace vs. Microsoft
  365 tenants); add others only if agencies actually ask.

## Open questions for Carlos

1. Google Cloud / Azure app registration ownership — whose account holds the
   OAuth client ID / app registration this ships under?
2. Does the Google OAuth consent screen need to go through verification for
   `drive.file` (usually not, since it's a non-sensitive scope, but worth
   confirming given the branding/logo requirements on the consent screen)?
3. Any objection to loading Google's/Microsoft's picker `<script>` tags
   on-demand (CSP implications — no CSP is currently configured in
   `next.config.ts`, so this would be the first time we'd need to think
   about a script-src allowlist)?
4. Naming: "Save to Google Drive" as a peer of "Save to File," or nested
   under a "Save" menu? Same question for the landing page's "Load from
   File" step.

## Files likely touched (when implemented)

- `src/components/editor/editor-sidebar.tsx` — Save/Load button options
- `src/app/page.tsx` (or landing page component) — "Load from File" step
- New: `src/lib/cloud-save/google-drive.ts`, `src/lib/cloud-save/onedrive.ts`
  — picker init, token handling, upload/download calls
- `docs/privacy-architecture.md` — append a short section once approved,
  rather than editing the "Resolved Decisions" table (those decisions still
  hold; this is a new one alongside them)
