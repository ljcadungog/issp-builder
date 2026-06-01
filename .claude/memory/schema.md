# Schema & Types — ph-issp-builder

Source of truth: `src/lib/store/types.ts`

---

## Root: `IsspDocument`

```ts
interface IsspDocument {
  version: "1.0";
  fileType: "issp-main";          // validated on loadFromFile
  exportedAt: string;             // ISO — updated on saveToFile
  tool: "issp-platform";
  schemaVersion?: number;         // 1=legacy, 2=planStatus added, 3=stakeholder services (current)
  title: string;
  startYear: number;              // locked to 2028
  endYear: number;                // locked to 2030
  amendmentNumber: number;
  scope: IsspScope;
  agencyHeadName: string;
  agency: AgencyInfo;
  planStatus?: "draft" | "for_review" | "submitted";
  submissionTarget?: { agency: string; deadline: string | null };
  sectionMeta?: Record<string, SectionMeta>;  // key = section path e.g. "part1/a"
  part1: Part1Data;
  part2: Part2Data;
  part3: Part3Data;
  part4: Part4Data;
  createdAt: string;
  updatedAt: string;              // touched on every store update
}
```

---

## Section Keys (`sectionMeta` + `SECTION_FIELDS`)

Source: `src/lib/section-fields.ts`

| Key | Part | Fields |
|---|---|---|
| `part1/a` | part1 | legalBasis, mandateFunction, visionStatement, missionStatement, orgOutcomes |
| `part1/b` | part1 | cioName/Position/Unit/Email/Contact, focalSameAsCio, focal*, humanCapital |
| `part1/c` | part1 | stakeholders |
| `part2/a` | part2 | strategicConcerns |
| `part2/b` | part2 | networkDiagrams, networkDescription, cybersecurityControls |
| `part2/c` | part2 | informationSystems |
| `part2/d` | part2 | egpChecklist |
| `part3/a` | part3 | proposedNetworkDataUrl, proposedNetworkDesc, proposedCybersecControls |
| `part3/b` | part3 | enterpriseArchDataUrl |
| `part3/c` | part3 | proposedHumanCapital |
| `part3/d` | part3 | proposedSystems |
| `part3/e1` | part3 | internalProjects |
| `part3/e2` | part3 | crossAgencyProjects |
| `part3/f` | part3 | performanceFramework |
| `part4/year1` | part4 | year1 |
| `part4/year2` | part4 | year2 |
| `part4/year3` | part4 | year3 |
| `part4/summary` | part4 | _(read-only computed; no writable fields)_ |

---

## Part1Data

```ts
interface Part1Data {
  legalBasis: string;
  mandateFunction: string;
  visionStatement: string;
  missionStatement: string;
  orgOutcomes: OrgOutcome[];        // { id, name, programs: string[] }
  cioName/Position/Unit/Email/Contact: string;
  focalSameAsCio: boolean;          // if true, focal fields mirror CIO
  focalName/Position/Unit/Email/Contact: string;
  humanCapital: HumanCapital;       // plantilla/contractual/outsourced × it/nonIt × male/female
  stakeholders: Stakeholder[];      // { id, name, services: StakeholderService[] }
}

interface StakeholderService {
  id: string;
  name: string;
  complexity: "Simple" | "Complex" | "Highly Technical";
}
```

> **Migration note:** Legacy docs stored `transactions` + `complexity` directly on `Stakeholder`.
> `migrateLegacyDoc` converts them to a `services` array (v2→v3). See `store.md`.

---

## Part2Data

```ts
interface Part2Data {
  strategicConcerns: StrategicConcern[];    // { id, outcomeIds[], criticalSystem, concern, currentStrategy, desiredStrategy }
  networkDiagrams: NetworkDiagram[];        // { id, dataUrl: base64, title }  — multiple allowed
  networkDescription: string;
  cybersecurityControls: CyberControls;     // 7 groups of boolean flags
  informationSystems: InformationSystem[];  // see IS type below
  egpChecklist: EgpChecklist;              // eGovPay, pnpki, hcmis, ifmis, onlinePortal, procurement, recordsMgmt, pscp
}
```

> **Migration note:** Legacy `StrategicConcern` had `outcomeId: string`. Migrated to `outcomeIds: string[]`.

### InformationSystem enums

```ts
classification: "G2C" | "G2B" | "G2G" | "G2E" | "INTERNAL" | ""
deploymentType: "HOSTED" | "CLOUD" | "HYBRID" | "ON_PREMISE" | ""
developmentStrategy: "IN_HOUSE" | "OUTSOURCED" | "HYBRID" | "COTS" | "OPEN_SOURCE" | ""
dataStorage: "ON_PREMISE" | "CLOUD" | "HYBRID" | ""
```

### CyberControls groups

`physical`, `perimeter`, `network`, `endpoint`, `data`, `application`, `other`
— all boolean flags. Default: all `false`. Factory: `makeCyberControls()` in `defaults.ts`.

---

## Part3Data

```ts
interface Part3Data {
  proposedNetworkDataUrl: string | null;   // base64 data URI (single diagram)
  proposedNetworkDesc: string;
  proposedCybersecControls: CyberControls;
  enterpriseArchDataUrl: string | null;    // base64 data URI
  proposedHumanCapital: HCRow[];           // { id, position, employmentStatus, quantity }
  proposedSystems: ProposedSystem[];       // mirrors InformationSystem shape + linkedProjectId
  internalProjects: IctProject[];
  crossAgencyProjects: IctProject[];
  performanceFramework: PerformanceFramework;  // Record<projectId, ProjectKpiSet>
}
```

> **Note:** Part 2 supports **multiple** network diagrams; Part 3-A only has **one** (single `dataUrl` field, not an array).

---

## Part4Data

```ts
interface Part4Data {
  year1: YearBudget;
  year2: YearBudget;
  year3: YearBudget;
}

interface YearBudget {
  officeProductivity: { capitalOutlay: LineItem[]; mooe: LineItem[] };
  internalProjects: Record<string, ProjectBudget>;   // keyed by project ID
  crossAgencyProjects: Record<string, ProjectBudget>;
  continuingCosts: { mooe: LineItem[] };
}

interface LineItem {
  id: string; item: string; office: string;
  uacsCode: string; uacsLabel: string; fundSource: string;
  qty: number; unitCost: number;
}
```

---

## AgencyInfo & Scope

```ts
type AgencyType = "NGA" | "GOCC" | "LGU" | "OTHER";

type IsspScope =
  | "DEPARTMENT_WIDE" | "DEPARTMENT_CENTRAL_ONLY"
  | "CENTRAL_ONLY" | "WITH_REGIONAL" | "WITH_BUREAUS"
  | "AGENCY_WIDE" | "AGENCY_CENTRAL_ONLY" | "AGENCY_WITH_REGIONAL"
  | "OTHER_GOVERNMENT_ENTITY" | "LGU_SCOPE";
```

---

## SectionMeta

```ts
interface SectionMeta {
  userMarkedDone: boolean;
  lastEditedAt: string | null;   // ISO timestamp; null = never edited
}
// Absent key in sectionMeta → { userMarkedDone: false, lastEditedAt: null }
```

Computed status: `"empty"` | `"in_progress"` | `"done"` (derived in UI, not stored directly).

---

## Schema Migration History

| Version | Change |
|---|---|
| 1 (legacy) | No `sectionMeta`, no `planStatus`, no `submissionTarget` |
| 2 | Added `planStatus`, `submissionTarget`, `sectionMeta` |
| 3 (current) | Stakeholder `transactions`+`complexity` → `services: StakeholderService[]` |

Run `migrateLegacyDoc()` on every load (IDB and file). It is **idempotent**.
