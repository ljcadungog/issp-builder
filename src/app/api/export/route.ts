import { renderIsspHtml } from "@/lib/pdf/render-issp-html";
import { generatePdf } from "@/lib/pdf/generate-pdf";
import { toRenderData } from "@/lib/pdf/to-render-data";
import type { IsspDocument } from "@/lib/store/types";

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let doc: IsspDocument;
  try {
    doc = (await req.json()) as IsspDocument;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!doc?.agency?.acronym || !doc?.startYear || !doc?.endYear) {
    return Response.json({ error: "Invalid ISSP document" }, { status: 400 });
  }

  const issp = toRenderData(doc);
  const html = renderIsspHtml(issp);
  const pdf = await generatePdf(html, {
    agencyAcronym: doc.agency.acronym,
    agencyName: doc.agency.name,
    logoSrc: doc.agency.logoBase64 || null,
    startYear: doc.startYear,
    endYear: doc.endYear,
  });

  const safeAcronym = (doc.agency.acronym ?? "AGENCY").replace(/[^\w\-]/g, "_");
  const filename = `${safeAcronym}-ISSP-${doc.startYear}-${doc.endYear}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.length),
    },
  });
}
