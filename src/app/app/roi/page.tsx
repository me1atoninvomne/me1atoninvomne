import type { Metadata } from "next";
import { RoiView } from "@/components/app/insights/roi-view";
import { requireSession } from "@/server/auth/session";
import { getRoiPage } from "@/server/services/insights-queries";

export const metadata: Metadata = { title: "ROI & Analyse" };

export default async function RoiPage() {
  const s = await requireSession();
  const data = await getRoiPage(s);
  return <RoiView data={data} canEditSettings={s.can("settings.edit")} />;
}
