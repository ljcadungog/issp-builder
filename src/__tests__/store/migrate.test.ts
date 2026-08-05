import { describe, it, expect } from "vitest";
import { migrateLegacyDoc, docContentHash } from "@/lib/store/index";
import { createEmptyDocument } from "@/lib/store/defaults";
import { CURRENT_SCHEMA_VERSION } from "@/lib/migration-review";
import type { IsspDocument } from "@/lib/store/types";
import type { NewDocOptions } from "@/lib/store/defaults";

const BASE_OPTS: NewDocOptions = {
  title: "Test ISSP",
  startYear: 2028,
  endYear: 2030,
  amendmentNumber: 0,
  scope: "AGENCY_WIDE",
  agencyHeadName: "Juan dela Cruz",
  agency: { name: "Test Agency", acronym: "TA", type: "NGA", websiteUrl: "", logoBase64: null },
};

// Helper: produce a v1 legacy document (no schemaVersion, no planStatus, no sectionMeta)
function makeLegacyV1Doc(): IsspDocument {
  const doc = createEmptyDocument(BASE_OPTS);
  // Strip v2+ fields to simulate a v1 doc
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v1 = { ...doc } as any;
  delete v1.schemaVersion;
  delete v1.planStatus;
  delete v1.submissionTarget;
  delete v1.sectionMeta;
  return v1 as IsspDocument;
}

describe("migrateLegacyDoc", () => {
  it("is idempotent on an already-current doc", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    const migrated = migrateLegacyDoc(doc);
    // Running it again should not change schemaVersion
    const migratedAgain = migrateLegacyDoc(migrated);
    expect(migratedAgain.schemaVersion).toBe(migrated.schemaVersion);
  });

  it("upgrades v1 → adds planStatus, submissionTarget, sectionMeta", () => {
    const v1 = makeLegacyV1Doc();
    expect(v1.schemaVersion).toBeUndefined();

    const migrated = migrateLegacyDoc(v1);
    expect(migrated.planStatus).toBe("draft");
    expect(migrated.submissionTarget).toEqual({ agency: "DICT", deadline: null });
    expect(migrated.sectionMeta).toBeDefined();
  });

  it("upgrades a v1 doc all the way to the current schema version", () => {
    const v1 = makeLegacyV1Doc();
    const migrated = migrateLegacyDoc(v1);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("migrates legacy stakeholder (transactions+complexity) to services array", () => {
    const v2Doc = createEmptyDocument(BASE_OPTS);
    // Simulate a v2 stakeholder using the old shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (v2Doc as any).schemaVersion = 2;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (v2Doc.part1.stakeholders as any) = [
      { id: "s1", name: "Citizens", transactions: "File requests", complexity: "Simple" },
    ];

    const migrated = migrateLegacyDoc(v2Doc);
    expect(migrated.part1.stakeholders[0].services).toBeDefined();
    expect(migrated.part1.stakeholders[0].services).toHaveLength(1);
    expect(migrated.part1.stakeholders[0].services[0].name).toBe("File requests");
    expect(migrated.part1.stakeholders[0].services[0].complexity).toBe("Simple");
  });

  it("preserves existing services array if already v3 shape", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    doc.part1.stakeholders = [
      { id: "s1", name: "Citizens", services: [{ id: "sv1", name: "Licensing", complexity: "Complex" }] },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).schemaVersion = 3;

    const migrated = migrateLegacyDoc(doc);
    expect(migrated.part1.stakeholders[0].services[0].name).toBe("Licensing");
    expect(migrated.part1.stakeholders[0].services[0].complexity).toBe("Complex");
  });

  it("migrates old single outcomeId → outcomeIds array", () => {
    const v2Doc = createEmptyDocument(BASE_OPTS);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (v2Doc as any).schemaVersion = 2;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (v2Doc.part2.strategicConcerns as any) = [
      { id: "c1", outcomeId: "o1", criticalSystem: "ERP", concern: "Aging", currentStrategy: "None", desiredStrategy: "Upgrade" },
    ];

    const migrated = migrateLegacyDoc(v2Doc);
    const concern = migrated.part2.strategicConcerns[0];
    expect(Array.isArray(concern.outcomeIds)).toBe(true);
    expect(concern.outcomeIds).toContain("o1");
  });

  it("normalises HCRow: generates id, renames physicalCount → quantity", () => {
    const v2Doc = createEmptyDocument(BASE_OPTS);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (v2Doc as any).schemaVersion = 2;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (v2Doc.part3.proposedHumanCapital as any) = [
      { position: "IT Officer", employmentStatus: "plantilla", physicalCount: 3 },
    ];

    const migrated = migrateLegacyDoc(v2Doc);
    const row = migrated.part3.proposedHumanCapital[0];
    expect(row.id).toBeTruthy();
    expect(row.quantity).toBe(3);
    expect(row.employmentStatus).toBe("PLANTILLA");
  });

  it("generates stakeholder IDs if missing", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc.part1.stakeholders as any) = [
      { id: "", name: "Businesses", services: [{ id: "", name: "Registration", complexity: "Simple" }] },
    ];
    const migrated = migrateLegacyDoc(doc);
    expect(migrated.part1.stakeholders[0].id).toBeTruthy();
    expect(migrated.part1.stakeholders[0].services[0].id).toBeTruthy();
  });
});

describe("docContentHash", () => {
  it("produces a string", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    expect(typeof docContentHash(doc)).toBe("string");
  });

  it("same doc produces same hash", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    expect(docContentHash(doc)).toBe(docContentHash(doc));
  });

  it("changing updatedAt does NOT change the hash", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    const hash1 = docContentHash(doc);
    const doc2 = { ...doc, updatedAt: new Date(Date.now() + 10000).toISOString() };
    expect(docContentHash(doc2)).toBe(hash1);
  });

  it("changing exportedAt does NOT change the hash", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    const hash1 = docContentHash(doc);
    const doc2 = { ...doc, exportedAt: new Date(Date.now() + 10000).toISOString() };
    expect(docContentHash(doc2)).toBe(hash1);
  });

  it("changing a content field DOES change the hash", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    const hash1 = docContentHash(doc);
    const doc2 = { ...doc, part1: { ...doc.part1, legalBasis: "Republic Act 10175" } };
    expect(docContentHash(doc2)).not.toBe(hash1);
  });

  it("userMarkedDone=true changes hash; false does not", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    const hash1 = docContentHash(doc);

    // false entry: stripped from meta → same hash
    const docFalse = { ...doc, sectionMeta: { "part1/a": { userMarkedDone: false, lastEditedAt: null } } };
    expect(docContentHash(docFalse)).toBe(hash1);

    // true entry: kept in meta → different hash
    const docTrue = { ...doc, sectionMeta: { "part1/a": { userMarkedDone: true, lastEditedAt: null } } };
    expect(docContentHash(docTrue)).not.toBe(hash1);
  });
});
