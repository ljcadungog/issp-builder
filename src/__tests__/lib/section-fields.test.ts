import { describe, it, expect } from "vitest";
import { SECTION_FIELDS, getChangedFields } from "@/lib/section-fields";
import { createEmptyDocument } from "@/lib/store/defaults";
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

function makeDoc(): IsspDocument {
  return createEmptyDocument(BASE_OPTS);
}

describe("SECTION_FIELDS", () => {
  it("contains all expected section keys", () => {
    const expectedKeys = [
      "part1/a", "part1/b", "part1/c",
      "part2/a", "part2/b", "part2/c", "part2/d",
      "part3/a", "part3/b", "part3/c", "part3/d", "part3/e1", "part3/e2", "part3/f",
      "part4/year1", "part4/year2", "part4/year3", "part4/summary",
    ];
    expectedKeys.forEach((key) => {
      expect(SECTION_FIELDS).toHaveProperty(key);
    });
  });

  it("part4/summary has no writable fields (read-only computed)", () => {
    expect(SECTION_FIELDS["part4/summary"].fields).toHaveLength(0);
  });

  it("every field definition has key and label", () => {
    for (const [, def] of Object.entries(SECTION_FIELDS)) {
      for (const field of def.fields) {
        expect(field.key).toBeTruthy();
        expect(field.label).toBeTruthy();
      }
    }
  });

  it("partKey values are valid part keys", () => {
    const validPartKeys = ["part1", "part2", "part3", "part4"];
    for (const [, def] of Object.entries(SECTION_FIELDS)) {
      expect(validPartKeys).toContain(def.partKey);
    }
  });
});

describe("getChangedFields", () => {
  it("returns empty array when current and snapshot are identical", () => {
    const doc = makeDoc();
    const changed = getChangedFields("part1/a", doc, doc);
    expect(changed).toHaveLength(0);
  });

  it("detects a changed legalBasis field in part1/a", () => {
    const current = makeDoc();
    const snapshot = makeDoc();
    current.part1 = { ...current.part1, legalBasis: "RA 10175" };

    const changed = getChangedFields("part1/a", current, snapshot);
    const keys = changed.map((f) => f.key);
    expect(keys).toContain("legalBasis");
  });

  it("does not report unchanged fields", () => {
    const current = makeDoc();
    const snapshot = makeDoc();
    current.part1 = { ...current.part1, legalBasis: "RA 10175" };

    const changed = getChangedFields("part1/a", current, snapshot);
    const keys = changed.map((f) => f.key);
    expect(keys).not.toContain("mandateFunction");
    expect(keys).not.toContain("visionStatement");
  });

  it("detects a stakeholder change in part1/c", () => {
    const current = makeDoc();
    const snapshot = makeDoc();
    current.part1 = {
      ...current.part1,
      stakeholders: [{ id: "s1", name: "Citizens", services: [] }],
    };

    const changed = getChangedFields("part1/c", current, snapshot);
    expect(changed.map((f) => f.key)).toContain("stakeholders");
  });

  it("detects userMarkedDone flip (false → true)", () => {
    const current = makeDoc();
    const snapshot = makeDoc();
    current.sectionMeta = { "part1/a": { userMarkedDone: true, lastEditedAt: null } };
    snapshot.sectionMeta = {};

    const changed = getChangedFields("part1/a", current, snapshot);
    const markedDoneField = changed.find((f) => f.key === "markedDone");
    expect(markedDoneField).toBeDefined();
    expect(markedDoneField?.label).toBe("Marked as done");
  });

  it("detects userMarkedDone flip (true → false)", () => {
    const current = makeDoc();
    const snapshot = makeDoc();
    current.sectionMeta = {};
    snapshot.sectionMeta = { "part1/a": { userMarkedDone: true, lastEditedAt: null } };

    const changed = getChangedFields("part1/a", current, snapshot);
    const markedDoneField = changed.find((f) => f.key === "markedDone");
    expect(markedDoneField).toBeDefined();
    expect(markedDoneField?.label).toBe("Unmarked as done");
  });

  it("returns empty for part4/summary (no writable fields, no sectionMeta change)", () => {
    const doc = makeDoc();
    const changed = getChangedFields("part4/summary", doc, doc);
    expect(changed).toHaveLength(0);
  });

  it("returns empty for unknown sectionId", () => {
    const doc = makeDoc();
    const changed = getChangedFields("unknown/section", doc, doc);
    expect(changed).toHaveLength(0);
  });
});
