"use client";

import Link from "next/link";
import { auditText } from "@/i18n/audit";
import { useFormat, useLang } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { ActorIcon } from "./badges";

export interface TimelineEvent {
  id: number;
  at: string;
  actorType: "ai" | "user" | "system" | "integration";
  actorName: string;
  action: string;
  params: Record<string, unknown>;
  documentId?: string | null;
}

const ACTOR_LABEL = {
  de: { ai: "KI", user: "Mensch", system: "System", integration: "Integration" },
  en: { ai: "AI", user: "Person", system: "System", integration: "Integration" },
};

export function AuditTimeline({ events, showDocumentLinks, dense }: { events: TimelineEvent[]; showDocumentLinks?: boolean; dense?: boolean }) {
  const lang = useLang();
  const f = useFormat();
  return (
    <ol className="relative">
      {events.map((e, i) => {
        const reasons = e.action === "document.routed" ? (e.params.reasonTexts as Record<string, string[]> | undefined)?.[lang] : undefined;
        return (
          <li key={e.id} className={cn("relative flex gap-3", dense ? "pb-3" : "pb-4")}>
            {i < events.length - 1 && <span className="absolute top-7 bottom-0 left-[13px] w-px bg-slate-200" aria-hidden />}
            <ActorIcon type={e.actorType} />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] leading-snug text-slate-800">{auditText(e.action, e.params, lang, f)}</p>
              {reasons && reasons.length > 1 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
                  {reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-400">
                <span className="font-medium text-slate-500">{e.actorName}</span>
                <span>·</span>
                <span>{ACTOR_LABEL[lang][e.actorType]}</span>
                <span>·</span>
                <time dateTime={e.at} className="tabular">
                  {f.dateTime(e.at)}
                </time>
                {showDocumentLinks && e.documentId && (
                  <>
                    <span>·</span>
                    <Link href={`/app/documents/${e.documentId}`} className="text-blue-700 hover:underline">
                      {lang === "de" ? "Dokument" : "Document"}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
