import type { Metadata } from "next";
import { InboxView } from "@/components/app/inbox/inbox-view";
import { requireSession } from "@/server/auth/session";
import { getInbox } from "@/server/services/queries";

export const metadata: Metadata = { title: "Posteingang" };

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ email?: string; tour?: string }> }) {
  const s = await requireSession();
  const data = await getInbox(s);
  const sp = await searchParams;
  return <InboxView data={data} canProcess={s.can("inbox.process")} initialEmailId={sp.email ?? null} tour={sp.tour === "1"} />;
}
