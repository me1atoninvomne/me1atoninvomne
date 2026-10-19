import { and, count, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/shell";
import { getSession } from "@/server/auth/session";
import { getDb, schema } from "@/server/db/client";
import { getExceptions, getNotifications } from "@/server/services/queries";

export const dynamic = "force-dynamic";


export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/demo?expired=1");
  const db = await getDb();
  const ws = s.workspace.id;
  const [[newEmails], [review], [erp], [decided]] = await Promise.all([
    db.select({ n: count() }).from(schema.emails).where(and(eq(schema.emails.workspaceId, ws), inArray(schema.emails.status, ["new", "error"]))),
    db
      .select({ n: count() })
      .from(schema.documents)
      .where(and(eq(schema.documents.workspaceId, ws), inArray(schema.documents.status, ["needs_review", "needs_approval", "info_requested"]))),
    db.select({ n: count() }).from(schema.erpRecords).where(and(eq(schema.erpRecords.workspaceId, ws), ne(schema.erpRecords.createdBy, "FlowPilot AI"))),
    db.select({ n: count() }).from(schema.documents).where(and(eq(schema.documents.workspaceId, ws), isNotNull(schema.documents.decidedBy))),
  ]);
  const exceptions = (await getExceptions(s)).filter((e) => e.category !== "recurring" && e.category !== "approval");
  const notifications = await getNotifications(s);
  const [{ n: processedCount }] = await db
    .select({ n: count() })
    .from(schema.emails)
    .where(and(eq(schema.emails.workspaceId, ws), eq(schema.emails.status, "processed")));

  return (
    <AppShell
      workspace={{ id: ws, name: s.workspace.name, industry: s.workspace.industry, isDemo: s.workspace.isDemo }}
      user={{ id: s.user.id, name: s.user.name, role: s.user.role, department: s.user.department, title: s.user.title }}
      users={s.users.map((u) => ({ id: u.id, name: u.name, role: u.role, department: u.department, title: u.title }))}
      counts={{ inbox: newEmails.n, review: review.n, exceptions: exceptions.length }}
      notifications={notifications}
      tour={{ processed: newEmails.n === 0 && processedCount > 0, reviewed: decided.n > 0, exported: erp.n > 0 }}
    >
      {children}
    </AppShell>
  );
}
