import { describe, it, expect } from "vitest";
import {
  PARTS,
  ALL_SECTIONS,
  TOTAL_SECTIONS,
  computeStatus,
  computePartStatus,
  findContinueTarget,
} from "@/lib/sections";

const done = { userMarkedDone: true, lastEditedAt: "2026-01-01T00:00:00.000Z" };
const edited = { userMarkedDone: false, lastEditedAt: "2026-01-01T00:00:00.000Z" };
const empty = { userMarkedDone: false, lastEditedAt: null };

describe("PARTS / ALL_SECTIONS", () => {
  it("has 18 total sections", () => {
    expect(TOTAL_SECTIONS).toBe(18);
    expect(ALL_SECTIONS).toHaveLength(18);
  });

  it("marks part4/summary as the only read-only section", () => {
    const readOnly = ALL_SECTIONS.filter((s) => s.readOnly);
    expect(readOnly.map((s) => s.id)).toEqual(["part4/summary"]);
  });
});

describe("computeStatus", () => {
  it("returns empty when meta is undefined", () => {
    expect(computeStatus(undefined)).toBe("empty");
  });

  it("returns empty when neither edited nor marked done", () => {
    expect(computeStatus(empty)).toBe("empty");
  });

  it("returns in_progress when edited but not marked done", () => {
    expect(computeStatus(edited)).toBe("in_progress");
  });

  it("returns done when userMarkedDone, regardless of lastEditedAt", () => {
    expect(computeStatus(done)).toBe("done");
    expect(computeStatus({ userMarkedDone: true, lastEditedAt: null })).toBe("done");
  });
});

describe("computePartStatus", () => {
  const part1 = PARTS[0].sections; // part1/a, /b, /c — none read-only
  const part4 = PARTS[3].sections; // includes read-only part4/summary

  it("returns done only when every tracked section is done", () => {
    const meta = { "part1/a": done, "part1/b": done, "part1/c": done };
    expect(computePartStatus(part1, meta)).toBe("done");
  });

  it("returns empty when every tracked section is empty", () => {
    expect(computePartStatus(part1, {})).toBe("empty");
  });

  it("returns in_progress when sections are mixed", () => {
    const meta = { "part1/a": done, "part1/b": edited };
    expect(computePartStatus(part1, meta)).toBe("in_progress");
  });

  it("ignores the read-only summary section", () => {
    // year1-3 done, summary untracked → still done because summary is excluded
    const meta = { "part4/year1": done, "part4/year2": done, "part4/year3": done };
    expect(computePartStatus(part4, meta)).toBe("done");
  });
});

describe("findContinueTarget", () => {
  it("falls back to the first section when nothing has been edited", () => {
    const target = findContinueTarget({});
    expect(target.section.id).toBe("part1/a");
    expect(target.part.partNum).toBe(1);
    expect(target.lastEditedAt).toBeNull();
  });

  it("returns the most recently edited section", () => {
    const meta = {
      "part1/a": { userMarkedDone: false, lastEditedAt: "2026-01-01T00:00:00.000Z" },
      "part3/d": { userMarkedDone: false, lastEditedAt: "2026-03-15T00:00:00.000Z" },
      "part2/b": { userMarkedDone: false, lastEditedAt: "2026-02-01T00:00:00.000Z" },
    };
    const target = findContinueTarget(meta);
    expect(target.section.id).toBe("part3/d");
    expect(target.part.partNum).toBe(3);
    expect(target.lastEditedAt).toBe("2026-03-15T00:00:00.000Z");
  });
});
