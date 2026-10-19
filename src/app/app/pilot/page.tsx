import type { Metadata } from "next";
import { PilotView } from "@/components/app/insights/pilot-view";
import { requireSession } from "@/server/auth/session";
import { getPilotPage } from "@/server/services/insights-queries";

export const metadata: Metadata = { title: "Pilotprojekt" };

export default async function PilotPage() {
  const s = await requireSession();
  const data = await getPilotPage(s);
  return <PilotView data={data} today={new Date().toISOString()} />;
}
