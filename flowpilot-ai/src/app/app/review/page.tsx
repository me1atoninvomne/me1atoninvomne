import type { Metadata } from "next";
import { ReviewQueue } from "@/components/app/review/review-queue";
import { requireSession } from "@/server/auth/session";
import { getReviewQueue } from "@/server/services/queries";

export const metadata: Metadata = { title: "Prüfung" };

export default async function ReviewPage() {
  const s = await requireSession();
  const queue = await getReviewQueue(s);
  return <ReviewQueue items={queue} users={s.users.map((u) => ({ id: u.id, name: u.name }))} />;
}
