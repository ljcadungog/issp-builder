# Components — ph-issp-builder

All components are in `src/components/`. No Storybook exists yet.

---

## UI Primitives (`src/components/ui/`)

shadcn/ui-based primitives. Tailwind CSS 4. All are theme-aware (`bg-card`, `text-foreground`, `border-border`).

| Component | File | Notes |
|---|---|---|
| `Button` | `button.tsx` | variants: default, outline, ghost, destructive |
| `Input` | `input.tsx` | card background + strong foreground; not transparent |
| `Textarea` | `textarea.tsx` | same treatment as Input |
| `Select` / `SelectTrigger` | `select.tsx` | theme-aware; not disabled-looking |
| `Checkbox` | `checkbox.tsx` | — |
| `Label` | `label.tsx` | — |
| `Card` | `card.tsx` | — |
| `Badge` | `badge.tsx` | — |
| `Dialog` | `dialog.tsx` | — |
| `Sheet` | `sheet.tsx` | Side-drawer; used by Part IV line-item editor |
| `Tabs` | `tabs.tsx` | — |
| `Tooltip` | `tooltip.tsx` | — |
| `Separator` | `separator.tsx` | — |
| `DropdownMenu` | `dropdown-menu.tsx` | — |
| `Avatar` | `avatar.tsx` | — |
| `Callout` | `callout.tsx` | Custom; info/warning/error callout box |
| `StatusDot` | `status-dot.tsx` | Colored dot: `"empty"` \| `"in_progress"` \| `"done"` → gray/amber/green |
| `CompletionBar` | `completion-bar.tsx` | Progress bar showing section completion ratio |
| `RelativeTime` | `relative-time.tsx` | Renders `lastEditedAt` as relative string (e.g. "2h ago") |
| `PlanStatusPill` | `plan-status-pill.tsx` | Pill for `planStatus`: draft/for_review/submitted |

---

## Editor Chrome (`src/components/editor/`)

| Component | File | Notes |
|---|---|---|
| `EditorShell` | `editor-shell.tsx` | `beforeunload` warning; desktop sidebar layout; mobile drawer context provider |
| `EditorSidebar` | `editor-sidebar.tsx` | Nav tree with `StatusDot` on each leaf; kebab (⋮) for file actions; Save to File; theme submenu (desktop) |
| `SectionShell` | `section-shell.tsx` | Shared chrome for all 18 form sections: title, MarkAsDone toggle, prev/next nav buttons |
| `NewIsspDialog` | `new-issp-dialog.tsx` | Creates a new document via `createNew()` |
| `IsspPropertiesDialog` | `issp-properties-dialog.tsx` | Edit doc title, scope, agency head; `ISSP_START_YEAR`/`ISSP_END_YEAR` locked (read-only) |
| `EditorMobileSidebarContext` | `editor-mobile-sidebar-context.tsx` | React context for mobile drawer open/close state |

### Overview sub-components (`src/components/editor/overview/`)

| Component | Notes |
|---|---|
| `OverviewHeader` | Doc title, agency name, status pill, plan metadata |
| `PlanMetadataStrip` | Submission target + deadline strip |
| `ContinueEditingCard` | "Pick up where you left off" — shows last-edited section |
| `PartCard` | Summary card per part: completion bar, section list with StatusDots |

---

## Form Components (`src/components/issp-editor/`)

### Shared

| Component | File | Notes |
|---|---|---|
| `DiagramUploadField` | `diagram-upload-field.tsx` | Image upload → base64 data URL; used in Part II-B, III-A, III-B |
| `UacsCombobox` | `uacs-combobox.tsx` | Async UACS code search; fetches `uacs_active.min.json` with basePath prefix |
| `SaveStatusIndicator` | `save-status-indicator.tsx` | **Removed from all forms** — sidebar is now the sole save status indicator |

### Part I Forms

| Component | Section | Key fields |
|---|---|---|
| `Part1AForm` | `part1/a` | legalBasis, mandateFunction, vision, mission, org outcomes |
| `Part1BForm` | `part1/b` | CIO info, focal person (with "same as CIO" toggle), human capital grid |
| `Part1CForm` | `part1/c` | Stakeholders + services table; auto-generates IDs on mount via `crypto.randomUUID()` |

### Part II Forms

| Component | Section | Key fields |
|---|---|---|
| `Part2AForm` | `part2/a` | Strategic concerns — multi-select `outcomeIds`, `criticalSystem`, concern, strategies |
| `Part2BForm` | `part2/b` | Network diagram upload (multiple), description, cybersecurity controls checklist |
| `Part2CForm` | `part2/c` | IS Inventory table — classification, deployment, development, users, interoperability, PIA |
| `Part2DForm` | `part2/d` | E-Government programs toggle list (eGovPay, PNPKI, HCMIS, IFMIS, etc.) |

### Part III Forms

| Component | Section | Key fields |
|---|---|---|
| `Part3AForm` | `part3/a` | Single proposed network diagram, description, proposed cybersec controls |
| `Part3BForm` | `part3/b` | Enterprise architecture diagram (single upload) |
| `Part3CForm` | `part3/c` | Proposed human capital rows; NaN guard on quantity; IDs generated on mount |
| `Part3DForm` | `part3/d` | Proposed information systems (mirrors IS Inventory + `linkedProjectId`) |
| `Part3E1Form` | `part3/e1` | Internal ICT projects |
| `Part3E2Form` | `part3/e2` | Cross-agency ICT projects |
| `Part3FForm` | `part3/f` | Performance framework — KPI sets per project (`PerformanceFramework` Record) |

### Part IV Forms

| Component | Section | Key fields |
|---|---|---|
| `Part4YearForm` | `part4/year{1,2,3}` | Budget master list + Sheet drawer for line items; CO/MOOE per category |
| `Part4Summary` | `part4/summary` | Read-only computed view; all 3 years; UACS grouping, subtotals, grand totals |

---

## Home / Landing (`src/components/home/`)

| Component | Notes |
|---|---|
| `HomePageClient` | Landing page client component: hero, MITHI checklist, "What's New" modal trigger, confetti |

---

## Layout (Dormant Dashboard) (`src/components/layout/`)

| Component | Notes |
|---|---|
| `Header` | Dormant dashboard header |
| `Sidebar` | Dormant dashboard sidebar |

---

## Key Patterns

### SectionShell usage

All 18 form pages wrap their content in `<SectionShell>`:

```tsx
<SectionShell
  sectionId="part1/a"
  title="Part I-A — Agency Profile"
  prevHref="/editor/part1"
  nextHref="/editor/part1/b"
>
  <Part1AForm />
</SectionShell>
```

`SectionShell` handles: MarkAsDone toggle, `updateSectionMeta`, `lastEditedAt` tracking, prev/next navigation.

### Form init pattern

```tsx
const { doc, loading, updatePart1 } = useIsspStore();
if (loading) return null;       // wait for IDB
if (!doc) redirect("/editor");  // no document loaded
```

### Deep-merge on mount

For nested objects that may be `{}` in legacy docs:

```tsx
const merged = { ...DEFAULT_HC, ...doc.part1.humanCapital };
```
