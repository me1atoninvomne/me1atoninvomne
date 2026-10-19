import { requireSession } from "@/server/auth/session";
import { api } from "@/server/http";
import type { AuditActorType } from "@/server/services/audit";
import { getAuditPage } from "@/server/services/queries";

const ACTORS: AuditActorType[] = ["ai", "user", "system", "integration"];

/** Older audit entries for "load more" (JSON, current workspace only). */
export const GET = api(async (req) => {
  const s = await requireSession();
  s.require("audit.read");
  const url = new URL(req.url);
  const actor = url.searchParams.get("actor");
  const before = Number(url.searchParams.get("before"));
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const q = (url.searchParams.get("q") ?? "").slice(0, 100);
  const events = await getAuditPage(s, {
    actorType: ACTORS.includes(actor as AuditActorType) ? (actor as AuditActorType) : undefined,
    search: q || undefined,
    before: Number.isFinite(before) && before > 0 ? before : undefined,
    limit,
  });
  return { events };
});
