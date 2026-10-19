import type { Metadata } from "next";
import { WorkflowsView } from "@/components/app/config/workflows-view";
import { requireSession } from "@/server/auth/session";
import { getWorkflowsPage } from "@/server/services/queries";

export const metadata: Metadata = { title: "Workflows & Regeln" };

export default async function WorkflowsPage({ searchParams }: { searchParams: Promise<{ tab?: string; workflow?: string }> }) {
  const s = await requireSession();
  const data = await getWorkflowsPage(s);
  const sp = await searchParams;
  return (
    <WorkflowsView
      data={data}
      canEditWorkflows={s.can("workflows.edit")}
      canEditRules={s.can("rules.edit")}
      industry={s.workspace.industry}
      isDemo={s.workspace.isDemo}
      initialTab={sp.tab === "rules" || sp.tab === "templates" ? sp.tab : "workflows"}
      initialWorkflowId={sp.workflow ?? null}
    />
  );
}
