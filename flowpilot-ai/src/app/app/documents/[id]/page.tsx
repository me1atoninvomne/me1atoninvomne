import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewView } from "@/components/app/review/review-view";
import { requireSession } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { getDocumentDetail, getReviewQueue } from "@/server/services/queries";

export const metadata: Metadata = { title: "Dokumentprüfung" };

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  let detail;
  try {
    detail = await getDocumentDetail(s, id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
  const queue = await getReviewQueue(s);
  const next = queue.find((q) => q.id !== id) ?? null;
  return (
    <ReviewView
      key={`${detail.doc.id}-${detail.doc.status}-${detail.timeline.length}`}
      detail={detail}
      nextId={next?.id ?? null}
      permissions={{
        edit: s.can("documents.edit"),
        approve: s.can("documents.approve"),
        reject: s.can("documents.reject"),
        handover: s.can("documents.handover"),
        acceptCritical: s.can("documents.accept_critical"),
      }}
      currentUserId={s.user.id}
    />
  );
}
