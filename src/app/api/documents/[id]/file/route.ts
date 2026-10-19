import { requireSession } from "@/server/auth/session";
import { errorResponse, type RouteParams } from "@/server/http";
import { getDocumentFile } from "@/server/services/queries";

/** Serves the original PDF of a document of the current workspace only. */
export async function GET(_req: Request, ctx: RouteParams<{ id: string }>) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const doc = await getDocumentFile(s, id);
    const name = (doc.fileName ?? "dokument.pdf").replace(/[^\w.\-]+/g, "_");
    return new Response(new Uint8Array(doc.file!), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
