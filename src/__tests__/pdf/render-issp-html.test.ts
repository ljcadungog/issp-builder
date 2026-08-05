import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  renderContentHtml,
  renderFrontMatterHtml,
  getTocEntries,
  php,
  total,
  sumLines,
  ooLabel,
  type IsspData,
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

/**
 * The renderer emits the ISSP as two standalone HTML documents, exactly as
 * `src/app/api/export/route.ts` drives it: front matter (cover / TOC /
 * definitions) is printed separately so Chromium's page counter restarts at 1
 * on Part I. This helper mirrors that composition so the tests exercise the
 * same pairing production does.
 */
function renderDocumentParts(issp: IsspData) {
  return {
    front: renderFrontMatterHtml(issp, null),
    content: renderContentHtml(issp),
  };
}

describe("render — full demo document", () => {
  const issp = toRenderData(loadDemoDoc());
  const { front, content } = renderDocumentParts(issp);

  it("emits two complete HTML documents", () => {
    for (const [name, html] of [["front", front], ["content", content]] as const) {
      expect(typeof html, name).toBe("string");
      expect(html.startsWith("<!DOCTYPE html>"), name).toBe(true);
      expect(html.trimEnd().endsWith("</html>"), name).toBe(true);
    }
    expect(content.length).toBeGreaterThan(5000);
  });

  it("includes the agency acronym and a section heading", () => {
    // Cover page carries the agency; the TOC carries the uppercase part labels.
    expect(front).toContain("NCWTR");
    expect(front).toContain("PART I. AGENCY PROFILE");
    // The four part headings themselves live in the content document
    // (title-cased in the markup, uppercased by CSS at print time).
    expect(content).toContain("Part I. Agency Profile");
    expect(content).toContain("Part II. Current ICT Assessment");
    expect(content).toContain("Part III. Proposed ICT Strategy");
    expect(content).toContain("Part IV. Resource Requirements");
  });

  it("renders formatted peso amounts from Part IV budgets", () => {
    expect(content).toMatch(/₱|PHP|\d,\d{3}\.\d{2}/);
  });

  it("every TOC entry has a matching anchor in one of the two documents", () => {
    const entries = getTocEntries(issp);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(front.includes(entry.id) || content.includes(entry.id), entry.id).toBe(true);
    }
  });
});

describe("render — empty document", () => {
  it("renders without throwing for a freshly created doc", () => {
    const doc = createEmptyDocument(BASE_OPTS);
    let front = "";
    let content = "";
    expect(() => {
      ({ front, content } = renderDocumentParts(toRenderData(doc)));
    }).not.toThrow();
    expect(front).toContain("Empty Smoke-Test ISSP");
    expect(content).toContain("Empty Smoke-Test ISSP");
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
