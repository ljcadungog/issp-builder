import { describe, it, expect } from "vitest";
import { createEmptyDocument, makeDefaultPart1, makeDefaultPart2, makeDefaultPart3, makeDefaultPart4 } from "@/lib/store/defaults";
import type { NewDocOptions } from "@/lib/store/defaults";

const BASE_OPTS: NewDocOptions = {
  title: "Test ISSP 2028-2030",
  startYear: 2028,
  endYear: 2030,
  amendmentNumber: 0,
  scope: "AGENCY_WIDE",
  agencyHeadName: "Juan dela Cruz",
  agency: {
    name: "Test Agency",
    acronym: "TA",
    type: "NGA",
    websiteUrl: "https://test.gov.ph",
    logoBase64: null,
  },
};

describe("createEmptyDocument", () => {
  it("sets required root fields", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    expect(doc.fileType).toBe("issp-main");
    expect(doc.version).toBe("1.0");
    expect(doc.tool).toBe("issp-platform");
    expect(doc.title).toBe("Test ISSP 2028-2030");
    expect(doc.startYear).toBe(2028);
    expect(doc.endYear).toBe(2030);
    expect(doc.scope).toBe("AGENCY_WIDE");
    expect(doc.agency.acronym).toBe("TA");
  });

  it("initialises with schemaVersion 2", () => {
    // createEmptyDocument predates the v3 stakeholder migration; new docs start at v2
    // and migrateLegacyDoc upgrades them on first load.
    const doc = createEmptyDocument(BASE_OPTS);
    expect(doc.schemaVersion).toBe(2);
  });

  it("sets planStatus to draft", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    expect(doc.planStatus).toBe("draft");
  });

  it("sets empty sectionMeta", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    expect(doc.sectionMeta).toEqual({});
  });

  it("has correct submissionTarget default", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    expect(doc.submissionTarget).toEqual({ agency: "DICT", deadline: null });
  });

  it("part1 has empty arrays and blank strings", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    expect(doc.part1.orgOutcomes).toEqual([]);
    expect(doc.part1.stakeholders).toEqual([]);
    expect(doc.part1.legalBasis).toBe("");
    expect(doc.part1.focalSameAsCio).toBe(false);
  });

  it("part2 has empty collections", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    expect(doc.part2.strategicConcerns).toEqual([]);
    expect(doc.part2.networkDiagrams).toEqual([]);
    expect(doc.part2.informationSystems).toEqual([]);
  });

  it("part2 cybersecurityControls defaults all to false", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    const c = doc.part2.cybersecurityControls;
    // Spot-check each group
    expect(c.physical.perimeterProtection).toBe(false);
    expect(c.perimeter.ngfw).toBe(false);
    expect(c.network.dataEncryption).toBe(false);
    expect(c.endpoint.antivirus).toBe(false);
    expect(c.data.dataClassification).toBe(false);
    expect(c.application.securityScanning).toBe(false);
    expect(c.other.mfa).toBe(false);
  });

  it("part2 egpChecklist defaults all to not_utilizing", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    const egp = doc.part2.egpChecklist;
    expect(egp.eGovPay.status).toBe("not_utilizing");
    expect(egp.pnpki.status).toBe("not_utilizing");
    expect(egp.hcmis.status).toBe("not_utilizing");
  });

  it("part3 has null diagram fields", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    expect(doc.part3.proposedNetworkDataUrl).toBeNull();
    expect(doc.part3.enterpriseArchDataUrl).toBeNull();
  });

  it("part4 year budgets start empty", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    expect(doc.part4.year1.officeProductivity.capitalOutlay).toEqual([]);
    expect(doc.part4.year1.officeProductivity.mooe).toEqual([]);
    expect(doc.part4.year1.internalProjects).toEqual({});
    expect(doc.part4.year1.crossAgencyProjects).toEqual({});
    expect(doc.part4.year1.continuingCosts.mooe).toEqual([]);
  });
});

describe("makeDefaultPart1", () => {
  it("humanCapital has zero headcount", () => {
    const p1 = makeDefaultPart1();
    expect(p1.humanCapital.plantilla.it.male).toBe(0);
    expect(p1.humanCapital.plantilla.it.female).toBe(0);
    expect(p1.humanCapital.outsourced.nonIt.female).toBe(0);
  });
});

describe("makeDefaultPart2", () => {
  it("networkDescription is empty string", () => {
    const p2 = makeDefaultPart2();
    expect(p2.networkDescription).toBe("");
  });
});

describe("makeDefaultPart3", () => {
  it("performanceFramework is empty record", () => {
    const p3 = makeDefaultPart3();
    expect(p3.performanceFramework).toEqual({});
  });
});

describe("makeDefaultPart4", () => {
  it("has year1, year2, year3 keys", () => {
    const p4 = makeDefaultPart4();
    expect(p4).toHaveProperty("year1");
    expect(p4).toHaveProperty("year2");
    expect(p4).toHaveProperty("year3");
  });
});
