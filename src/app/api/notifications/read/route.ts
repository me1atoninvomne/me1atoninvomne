import { and, eq } from "drizzle-orm";
import { requireSession } from "@/server/auth/session";
import { getDb, schema } from "@/server/db/client";
import { api } from "@/server/http";

export const POST = api(async () => {
  const s = await requireSession();
  const db = await getDb();
  await db.update(schema.notifications).set({ read: true }).where(and(eq(schema.notifications.workspaceId, s.workspace.id), eq(schema.notifications.read, false)));
  return { ok: true };
});
