import { describe, it, expect } from "vitest";
import {
  DIAGRAM_IMAGE_TYPES,
  DIAGRAM_ACCEPT,
  DIAGRAM_MAX_FILE_SIZE_BYTES,
  getDiagramUploadError,
  createDiagramId,
} from "@/lib/diagram-upload";

// Minimal File stand-in — getDiagramUploadError only reads `type` and `size`.
function fakeFile(type: string, size: number): File {
  return { type, size } as File;
}

describe("constants", () => {
  it("accept string lists all allowed image types", () => {
    expect(DIAGRAM_ACCEPT).toBe(DIAGRAM_IMAGE_TYPES.join(","));
    expect(DIAGRAM_ACCEPT).toContain("image/svg+xml");
  });

  it("max file size is 10 MB", () => {
    expect(DIAGRAM_MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe("getDiagramUploadError", () => {
  it("returns null for a valid PNG under the size limit", () => {
    expect(getDiagramUploadError(fakeFile("image/png", 1024))).toBeNull();
  });

  it("accepts every allowed image type", () => {
    for (const type of DIAGRAM_IMAGE_TYPES) {
      expect(getDiagramUploadError(fakeFile(type, 1024))).toBeNull();
    }
  });

  it("rejects an unsupported MIME type", () => {
    expect(getDiagramUploadError(fakeFile("application/pdf", 1024))).toMatch(/PNG, JPG, WebP, or SVG/);
  });

  it("rejects a file over the size limit", () => {
    const tooBig = fakeFile("image/png", DIAGRAM_MAX_FILE_SIZE_BYTES + 1);
    expect(getDiagramUploadError(tooBig)).toMatch(/smaller than 10 MB/);
  });

  it("checks type before size", () => {
    const badTypeAndSize = fakeFile("text/plain", DIAGRAM_MAX_FILE_SIZE_BYTES + 1);
    expect(getDiagramUploadError(badTypeAndSize)).toMatch(/PNG, JPG, WebP, or SVG/);
  });
});

describe("createDiagramId", () => {
  it("produces a non-empty string", () => {
    expect(typeof createDiagramId()).toBe("string");
    expect(createDiagramId().length).toBeGreaterThan(0);
  });

  it("produces unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 50 }, () => createDiagramId()));
    expect(ids.size).toBe(50);
  });
});
