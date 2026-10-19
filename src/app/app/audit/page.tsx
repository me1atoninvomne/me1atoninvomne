import type { Metadata } from "next";
import { AuditLog } from "@/components/app/ops/audit-log";
import { AUDIT_PAGE_SIZE } from "@/components/app/ops/constants";
import { requireSession } from "@/server/auth/session";
import type { AuditActorType } from "@/server/services/audit";
import { getAuditPage } from "@/server/services/queries";

export const metadata: Metadata = { title: "Aktivitätsprotokoll" };

const ACTORS: AuditActorType[] = ["ai", "user", "system", "integration"];

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ actor?: string; q?: string }> }) {
  const s = await requireSession();
  const sp = await searchParams;
  const actor = ACTORS.includes(sp.actor as AuditActorType) ? (sp.actor as AuditActorType) : undefined;
  const q = (sp.q ?? "").slice(0, 100);
  const events = await getAuditPage(s, { actorType: actor, search: q || undefined, limit: AUDIT_PAGE_SIZE });
  return <AuditLog key={`${actor ?? "all"}-${q}`} initial={events} actor={actor ?? "all"} query={q} canExport={s.can("audit.export")} />;
}
