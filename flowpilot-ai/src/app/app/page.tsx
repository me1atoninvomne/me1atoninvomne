import type { Metadata } from "next";
import { DashboardView } from "@/components/app/insights/dashboard-view";
import { requireSession } from "@/server/auth/session";
import { getDashboard } from "@/server/services/queries";

export const metadata: Metadata = { title: "Übersicht" };

export default async function DashboardPage() {
  const s = await requireSession();
  const data = await getDashboard(s);
  const openReviews =
    (data.metrics.statusCounts.needs_review ?? 0) + (data.metrics.statusCounts.needs_approval ?? 0) + (data.metrics.statusCounts.info_requested ?? 0);
  return (
    <DashboardView
      metrics={data.metrics}
      queue={data.queue}
      openReviews={openReviews}
      recent={data.recent.slice(0, 8).map((e) => ({ id: e.id, at: e.at, actorType: e.actorType, actorName: e.actorName, action: e.action, params: e.params, documentId: e.documentId }))}
      exceptionCounts={data.exceptions.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + 1;
        return acc;
      }, {})}
      exceptionTotal={data.exceptions.filter((e) => e.category !== "approval").length}
      users={s.users.map((u) => ({ id: u.id, name: u.name }))}
    />
  );
}
