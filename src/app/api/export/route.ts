import { getTocEntries, renderContentHtml, renderFrontMatterHtml, renderAnnex1Html } from "@/lib/pdf/render-issp-html";
import { toRenderData } from "@/lib/pdf/to-render-data";
import { generatePdf } from "@/lib/pdf/generate-pdf";
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
  const safeAcronym = (doc.agency.acronym ?? "AGENCY").replace(/[^\w\-]/g, "_");
  const filename = `${safeAcronym}-ISSP-${doc.startYear}-${doc.endYear}.pdf`;

  // Stream progress as Server-Sent Events while the PDF is generated. The final
  // `done` event carries the PDF as base64 (SSE is text-only). The doc is
  // rendered and printed exactly as before — only the response wrapping changes.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        const pdf = await generatePdf(
          {
            contentHtml: renderContentHtml(issp, { withTocMarkers: true }),
            finalizeContentHtml: () => renderContentHtml(issp),
            frontHtml: (tocPages, withDefinitionMarker) => renderFrontMatterHtml(issp, tocPages, withDefinitionMarker),
            annex1Html: renderAnnex1Html(doc.title, doc.annexedOffices ?? []),
            tocEntries: getTocEntries(issp),
          },
          {
            agencyAcronym: doc.agency.acronym,
            agencyName: doc.agency.name,
            logoSrc: doc.agency.logoBase64 || null,
            startYear: doc.startYear,
            endYear: doc.endYear,
          },
          ({ stage, pct }) => send("progress", { stage, pct })
        );
        send("done", { filename, pdf: pdf.toString("base64") });
      } catch (err) {
        const message = err instanceof Error && err.message ? err.message : "PDF generation failed.";
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      // nginx buffers proxied responses by default, which would hold all SSE
      // events until the stream ends and defeat the live progress bar.
      "X-Accel-Buffering": "no",
    },
  });
}
