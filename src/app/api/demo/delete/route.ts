import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { USER_COOKIE, WS_COOKIE } from "@/server/auth/session";
import { getDb, schema } from "@/server/db/client";
import { errorResponse } from "@/server/http";
import { deleteWorkspace } from "@/server/services/workspace";

/**
 * Self-service erasure: deletes the visitor's demo workspace with every document, file, task,
 * rule, log entry and notification, then removes the demo cookies. Only demo workspaces can be
 * deleted this way. Accepts a plain form post (redirect) or JSON.
 */
export async function POST(req: Request) {
  try {
    const store = await cookies();
    const wsId = store.get(WS_COOKIE)?.value;
    if (wsId) {
      const db = await getDb();
      const ws = await db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, wsId) });
      if (ws?.isDemo) await deleteWorkspace(db, ws.id);
    }
    store.delete(WS_COOKIE);
    store.delete(USER_COOKIE);
    const isForm = (req.headers.get("content-type") ?? "").includes("form");
    if (isForm) return new Response(null, { status: 303, headers: { Location: "/demo?deleted=1" } });
    return Response.json({ ok: true, redirect: "/demo?deleted=1" });
  } catch (error) {
    return errorResponse(error);
  }
}
