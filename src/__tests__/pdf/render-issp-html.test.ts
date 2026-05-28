import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  renderIsspHtml,
  php,
  total,
  sumLines,
  ooLabel,
  type LineItem,
} from "@/lib/pdf/render-issp-html";
import { toRenderData } from "@/lib/pdf/to-render-data";
import { migrateLegacyDoc } from "@/lib/store/index";
import { createEmptyDocument, type NewDocOptions } from "@/lib/store/defaults";
import type { IsspDocument } from "@/lib/store/types";

const DEMO_PATH = path.join(process.cwd(), "public", "demo", "ncwtr-issp-2026-2028.issp");

function loadDemoDoc(): IsspDocument {
  const raw = JSON.parse(readFileSync(DEMO_PATH, "utf8")) as IsspDocument;
  return migrateLegacyDoc(raw); // mirror the store's load path
}

const BASE_OPTS: NewDocOptions = {
  title: "Empty Smoke-Test ISSP",
  startYear: 2028,
  endYear: 2030,
  amendmentNumber: 0,
  scope: "AGENCY_WIDE",
  agencyHeadName: "Juan dela Cruz",
  agency: { name: "Test Agency", acronym: "TA", type: "NGA", websiteUrl: "", logoBase64: null },
};

function lineItem(qty: number, unitCost: number): LineItem {
  return { id: "x", item: "Server", office: "ICTU", uacsCode: "", uacsLabel: "", fundSource: "GAA", qty, unitCost };
}

describe("renderIsspHtml — full demo document", () => {
  const html = renderIsspHtml(toRenderData(loadDemoDoc()));

  it("returns a complete HTML document", () => {
    expect(typeof html).toBe("string");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html.length).toBeGreaterThan(5000);
  });

  it("includes the agency acronym and a section heading", () => {
    expect(html).toContain("NCWTR");
    // Definitions/TOC and all four parts should be present
    expect(html).toContain("PART I");
  });

  it("renders formatted peso amounts from Part IV budgets", () => {
    expect(html).toMatch(/₱|PHP|\d,\d{3}\.\d{2}/);
  });
});

describe("renderIsspHtml — empty document", () => {
  it("renders without throwing for a freshly created doc", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    let html = "";
    expect(() => {
      html = renderIsspHtml(toRenderData(doc));
    }).not.toThrow();
    expect(html).toContain("Empty Smoke-Test ISSP");
  });
});

describe("php", () => {
  it("formats a peso amount with two decimals and thousands separators", () => {
    expect(php(1000)).toMatch(/1,000\.00/);
    expect(php(1000)).toMatch(/₱|PHP/);
  });

  it("formats zero", () => {
    expect(php(0)).toMatch(/0\.00/);
  });
});

describe("total / sumLines", () => {
  it("total multiplies quantity by unit cost", () => {
    expect(total(lineItem(3, 100))).toBe(300);
    expect(total(lineItem(0, 999))).toBe(0);
  });

  it("sumLines adds all line totals", () => {
    expect(sumLines([lineItem(2, 50), lineItem(1, 100)])).toBe(200);
    expect(sumLines([])).toBe(0);
  });
});

describe("ooLabel", () => {
  it("maps agency type to the correct outcome label", () => {
    expect(ooLabel("GOCC")).toBe("Strategic Objectives (SO)");
    expect(ooLabel("LGU")).toBe("Major Final Outputs (MFO)");
    expect(ooLabel("NGA")).toBe("Organizational Outcomes (OO)");
    expect(ooLabel("anything-else")).toBe("Organizational Outcomes (OO)");
  });
});
