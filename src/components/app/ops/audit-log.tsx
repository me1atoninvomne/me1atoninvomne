"use client";

import { Download, Lock, Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { fmt } from "@/i18n/core";
import { useT } from "@/i18n/client";
import { auditDictUi } from "@/i18n/ui/ops";
import { apiFetch } from "@/lib/api-client";
import { Button, ButtonLink } from "../../ui/button";
import { Card, PageHeader } from "../../ui/card";
import { Callout, EmptyState } from "../../ui/feedback";
import { Input } from "../../ui/form";
import { Tooltip } from "../../ui/overlay";
import { Segmented } from "../../ui/tabs";
import { useToast } from "../../ui/toast";
import { AuditTimeline, type TimelineEvent } from "../timeline";
import { AUDIT_PAGE_SIZE } from "./constants";

type Actor = "all" | "ai" | "user" | "system" | "integration";

export function AuditLog({ initial, actor, query, canExport }: { initial: TimelineEvent[]; actor: Actor; query: string; canExport: boolean }) {
  const t = useT(auditDictUi);
  const router = useRouter();
  const pathname = usePathname();
  const { push } = useToast();
  const [events, setEvents] = useState<TimelineEvent[]>(initial);
  const [done, setDone] = useState(initial.length < AUDIT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(query);

  const navigate = (next: { actor?: Actor; q?: string }) => {
    const params = new URLSearchParams();
    const a = next.actor ?? actor;
    const q = next.q ?? query;
    if (a !== "all") params.set("actor", a);
    if (q) params.set("q", q);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  async function loadMore() {
    const last = events[events.length - 1];
    if (!last) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ before: String(last.id), limit: String(AUDIT_PAGE_SIZE) });
      if (actor !== "all") params.set("actor", actor);
      if (query) params.set("q", query);
      const res = await apiFetch<{ events: TimelineEvent[] }>(`/app/audit/events?${params}`);
      setEvents((list) => [...list, ...res.events]);
      if (res.events.length < AUDIT_PAGE_SIZE) setDone(true);
    } catch {
      push({ tone: "error", title: t.loadError });
    } finally {
      setLoading(false);
    }
  }

  const exportButton = canExport ? (
    <ButtonLink href="/api/export/audit" size="sm" icon={<Download className="size-4" />}>
      {t.export}
    </ButtonLink>
  ) : (
    <Tooltip content={t.exportDisabled}>
      <span>
        <Button size="sm" icon={<Download className="size-4" />} disabled>
          {t.export}
        </Button>
      </span>
    </Tooltip>
  );

  return (
    <div>
      <PageHeader title={t.title} description={t.description} actions={exportButton} />
      <Callout tone="neutral" title={t.calloutTitle} icon={<Lock className="size-4 text-slate-500" />} className="mb-4">
        {t.calloutText}
      </Callout>

      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Segmented<Actor>
          value={actor}
          onChange={(a) => navigate({ actor: a })}
          options={(["all", "ai", "user", "system", "integration"] as Actor[]).map((a) => ({ value: a, label: t.actors[a] }))}
        />
        <form
          className="flex gap-2 md:w-96"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ q: search.trim() });
          }}
          role="search"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder} className="pl-9" aria-label={t.searchPlaceholder} />
          </div>
          <Button type="submit" size="md">
            {t.search}
          </Button>
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="md"
              aria-label={t.clear}
              onClick={() => {
                setSearch("");
                navigate({ q: "" });
              }}
            >
              <X className="size-4" />
            </Button>
          )}
        </form>
      </div>

      <Card className="px-4 py-4 sm:px-5" as="div">
        {events.length === 0 ? (
          <EmptyState icon={<Search className="size-5" />} title={t.empty} text={t.emptyText} />
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-500">{fmt(t.count, { n: events.length })}</p>
            <AuditTimeline events={events} showDocumentLinks />
            <div className="mt-2 flex justify-center border-t border-slate-100 pt-4">
              {done ? (
                <p className="text-xs text-slate-400">{t.noMore}</p>
              ) : (
                <Button size="sm" onClick={loadMore} loading={loading}>
                  {t.loadMore}
                </Button>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
