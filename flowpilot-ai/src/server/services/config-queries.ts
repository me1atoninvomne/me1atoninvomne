import "server-only";
import { eq } from "drizzle-orm";
import type { Session } from "@/server/auth/session";
import { getDb, schema } from "@/server/db/client";

/** Read model for the settings page. */
export async function getSettingsPage(s: Session) {
  const db = await getDb();
  const workflows = await db.query.workflows.findMany({ where: eq(schema.workflows.workspaceId, s.workspace.id) });
  return {
    workspace: { name: s.workspace.name, industry: s.workspace.industry, isDemo: s.workspace.isDemo },
    settings: s.workspace.settings,
    users: s.users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, department: u.department, title: u.title, active: u.active })),
    workflows: workflows.map((w) => ({ id: w.id, name: w.name, docTypes: w.docTypes, active: w.active, params: w.params, version: w.version })),
  };
}

export type SettingsPageData = Awaited<ReturnType<typeof getSettingsPage>>;
