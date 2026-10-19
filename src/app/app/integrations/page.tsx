import type { Metadata } from "next";
import { IntegrationsView } from "@/components/app/ops/integrations-view";
import { requireSession } from "@/server/auth/session";
import { getIntegrationsPage } from "@/server/services/queries";

export const metadata: Metadata = { title: "Integrationen" };

export default async function IntegrationsPage() {
  const s = await requireSession();
  const data = await getIntegrationsPage(s);
  return (
    <IntegrationsView
      catalogue={data.catalogue}
      provider={data.provider}
      erp={data.erp.map((r) => ({ id: r.id, documentId: r.documentId, kind: r.kind, externalRef: r.externalRef, payload: r.payload, createdAt: r.createdAt, createdBy: r.createdBy }))}
    />
  );
}
