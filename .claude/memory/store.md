# Store API & Gotchas — ph-issp-builder

Source: `src/lib/store/index.tsx`
Provider: `<IsspStoreProvider>` wraps the entire editor layout (`src/app/editor/layout.tsx`).
Hook: `useIsspStore()` — throws if called outside the provider.

---

## IsspStoreValue API

```ts
// State
doc: IsspDocument | null      // null while loading OR when no doc exists
loading: boolean              // true during initial IDB load
saveStatus: "idle" | "saving" | "saved"
fileSavedAt: string | null    // ISO timestamp of last explicit "Save to File"
savedSnapshot: IsspDocument | null  // in-memory clone at last save/load (see gotchas)
unsavedToFile: boolean        // true when doc differs from savedSnapshot

// Mutations
update(patcher)               // general: (prev) => IsspDocument
updatePart1(patch)            // shallow-merge into part1
updatePart2(patch)            // shallow-merge into part2
updatePart3(patch)            // shallow-merge into part3
updatePart4(patch)            // shallow-merge into part4
updateSectionMeta(id, patch)  // update sectionMeta[id]

// Document lifecycle
replace(doc)                  // replace entire doc (used internally by loadFromFile)
createNew(opts)               // create + load blank doc; sets savedSnapshot
clearDoc()                    // delete from IDB + reset state
saveToFile()                  // download .issp file; resets unsavedToFile
loadFromFile(file)            // parse + migrate + load; returns { success, error? }
```

---

## Critical Gotchas

### 1. Always check `loading` before `doc`

Every form page must guard against premature redirect:

```tsx
const { doc, loading } = useIsspStore();

if (loading) return null;                    // ← REQUIRED; wait for IDB
if (!doc) redirect("/editor");              // ← only redirect after load completes
```

**Without this guard**, a hard refresh redirects to `/editor` while IDB is still reading, even if a document exists. All 18 form pages (`part1/a` through `part4/summary`) have this pattern.

---

### 2. `savedSnapshot` is null on fresh browser load

`savedSnapshot` is only set after:
- `createNew()` — new document created
- `loadFromFile()` — file opened
- `saveToFile()` — file saved

On a **fresh page load** (IDB restore after browser restart), `savedSnapshot` is `null`. The `unsavedToFile` fallback then compares `doc.updatedAt` against `fileSavedAt ?? doc.createdAt`.

This means: after a browser restart, even an unchanged doc shows as "unsaved" — this is expected, because we can't verify whether the in-memory state matches the last-saved file.

---

### 3. `migrateLegacyDoc` runs on every load

Called in:
- `idbLoad()` result handler (initial page load)
- `loadFromFile()` (file open)

It is **idempotent** — safe to run on already-current docs. It also calls `deriveMetaFromContent()` to backfill `sectionMeta.lastEditedAt` from existing content.

Current migration chain: v1→v2→v3 (see `schema.md`).

---

### 4. IDB save is debounced (1 500 ms)

`update()` / `updatePart*()` schedule a debounced IDB write via `scheduleSave()`. The write doesn't happen immediately — if you call `update()` then immediately read IDB, you may get stale data.

`saveToFile()` bypasses the debounce — it calls `idbSave(exported)` synchronously.

---

### 5. Deep-merge defaults on mount for nested objects

Some nested fields (`humanCapital`, `cybersecurityControls`) can be `{}` in legacy/demo data. Form components must deep-merge against defaults on mount:

```tsx
// Part I-B example
const hc = doc.part1.humanCapital;
const merged = {
  plantilla:   { ...DEFAULT_HC.plantilla,   ...hc?.plantilla },
  contractual: { ...DEFAULT_HC.contractual, ...hc?.contractual },
  outsourced:  { ...DEFAULT_HC.outsourced,  ...hc?.outsourced },
};
```

Factories are in `src/lib/store/defaults.ts`: `makeHumanCapital()`, `makeCyberControls()`, `makeEgpChecklist()`.

---

### 6. `docContentHash` strips timestamps before comparison

`unsavedToFile` uses `docContentHash()` which:
- Removes `updatedAt`, `exportedAt`
- Keeps only `sectionMeta` entries where `userMarkedDone === true`

This means toggling `lastEditedAt` or saving to IDB does **not** count as an unsaved file change.

---

### 7. `updateSectionMeta` merges, never replaces

```ts
updateSectionMeta("part1/a", { userMarkedDone: true })
// Internally: { userMarkedDone: false, lastEditedAt: null, ...existing, ...patch }
```

The default `{ userMarkedDone: false, lastEditedAt: null }` is applied first, then existing, then the patch — so existing values are preserved.

---

## IDB Helpers

Source: `src/lib/store/idb.ts`

```ts
idbSave(doc)       // write to IndexedDB key "issp-doc"
idbLoad()          // read from IndexedDB key "issp-doc"; returns null if absent
idbClear()         // delete key "issp-doc"
```

Uses `idb-keyval` under the hood. The key is `"issp-doc"` (single document per browser).

---

## File Format

`.issp` files are JSON blobs with `fileType: "issp-main"`. Validated on `loadFromFile()` — file is rejected if `fileType !== "issp-main"`.

Filename generated as: `{ACRONYM}-ISSP-{startYear}-{endYear}.issp` (e.g. `NCWTR-ISSP-2028-2030.issp`).
