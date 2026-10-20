"use client";

import { ArrowLeft, ArrowRight, Check, ExternalLink, FileText, Inbox, Loader2, MailPlus, Paperclip, Play, Search, Sparkles, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DocType } from "@/domain/types";
import { fmt } from "@/i18n/core";
import { useDomain, useFormat, useLang, useT } from "@/i18n/client";
import { issueText } from "@/i18n/domain";
import { inboxDict } from "@/i18n/ui/inbox";
import { apiFetch, useMutation } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import type { InboxData, InboxEmail } from "@/server/services/queries";
import type { ProcessedDocSummary } from "@/server/services/processing";
import { Badge } from "../../ui/badge";
import { Button, ButtonLink } from "../../ui/button";
import { Card } from "../../ui/card";
import { Callout, EmptyState } from "../../ui/feedback";
import { Input } from "../../ui/form";
import { Segmented } from "../../ui/tabs";
import { useToast } from "../../ui/toast";
import { ConfidenceBadge, DocTypeBadge, PriorityBadge, RouteBadge, SeverityIcon, StatusBadge } from "../badges";

type Filter = "all" | "new" | "review" | "auto" | "critical";
const STEPS = ["text", "classify", "extract", "match", "validate", "rules", "route"] as const;
const STEP_MS = 130;

interface LiveState {
  running: boolean;
  currentId: string | null;
  step: number;
  results: Record<string, ProcessedDocSummary[]>;
  order: string[];
}

export function InboxView({ data, canProcess, initialEmailId, tour }: { data: InboxData; canProcess: boolean; initialEmailId: string | null; tour: boolean }) {
  const t = useT(inboxDict);
  const router = useRouter();
  const { push } = useToast();
  const { run, pending, errorMessage } = useMutation();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialEmailId ?? (data.emails.find((e) => e.documents.some((d) => d.critical + d.warnings > 0)) ?? data.emails.find((e) => e.status === "new") ?? data.emails[0])?.id ?? null,
  );
  const [mobileDetail, setMobileDetail] = useState(Boolean(initialEmailId));
  const [live, setLive] = useState<LiveState>({ running: false, currentId: null, step: 0, results: {}, order: [] });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pendingEmails = data.emails.filter((e) => e.status === "new" || e.status === "error");

  const counts = useMemo(
    () => ({
      all: data.emails.length,
      new: pendingEmails.length,
      review: data.emails.filter((e) => e.documents.some((d) => ["needs_review", "needs_approval", "info_requested"].includes(d.status))).length,
      auto: data.emails.filter((e) => e.documents.some((d) => d.route === "auto")).length,
      critical: data.emails.filter((e) => e.documents.some((d) => d.critical > 0)).length,
    }),
    [data.emails, pendingEmails.length],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.emails.filter((e) => {
      if (filter === "new" && !(e.status === "new" || e.status === "error")) return false;
      if (filter === "review" && !e.documents.some((d) => ["needs_review", "needs_approval", "info_requested"].includes(d.status))) return false;
      if (filter === "auto" && !e.documents.some((d) => d.route === "auto")) return false;
      if (filter === "critical" && !e.documents.some((d) => d.critical > 0)) return false;
      if (!q) return true;
      const hay = [e.fromName, e.fromEmail, e.subject, ...e.documents.map((d) => `${d.documentNumber ?? ""} ${d.partyName ?? ""} ${d.fileName ?? ""}`)].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [data.emails, filter, query]);

  const selected = data.emails.find((e) => e.id === selectedId) ?? null;

  // Auto-start hint for the guided demo: highlight the process button.
  const highlightProcess = tour && pendingEmails.length > 0 && !live.running && Object.keys(live.results).length === 0;

  async function processQueue(ids: string[]) {
    if (ids.length === 0) return;
    setLive({ running: true, currentId: null, step: 0, results: {}, order: ids });
    const results: Record<string, ProcessedDocSummary[]> = {};
    for (const id of ids) {
      setSelectedId(id);
      setLive((l) => ({ ...l, currentId: id, step: 0 }));
      const request = apiFetch<{ documents: ProcessedDocSummary[] }>(`/api/emails/${id}/process`, { body: {} });
      // Visual pacing through the real pipeline steps while the request runs.
      for (let s = 1; s <= STEPS.length; s++) {
        await new Promise((r) => setTimeout(r, STEP_MS));
        setLive((l) => ({ ...l, step: s }));
      }
      try {
        const res = await request;
        results[id] = res.documents;
        setLive((l) => ({ ...l, results: { ...l.results, [id]: res.documents } }));
      } catch (err) {
        push({ tone: "error", title: errorMessage(err) });
      }
      router.refresh();
    }
    setLive((l) => ({ ...l, running: false, currentId: null }));
  }

  async function simulate() {
    try {
      const res = await run<{ emailId: string; remaining: number }>("/api/inbox/simulate", { body: {} }, { refresh: true });
      push({ tone: "success", title: t.simulated, text: fmt(t.remaining, { n: res.remaining }) });
      setFilter("all");
      setSelectedId(res.emailId);
      await processQueue([res.emailId]);
    } catch {
      /* toast shown */
    }
  }

  async function onUpload(file: File) {
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    try {
      const res = await run<{ emailId: string }>("/api/inbox/upload", { form }, { refresh: true });
      setFilter("all");
      await processQueue([res.emailId]);
      push({ tone: "success", title: t.uploaded });
    } catch {
      /* toast shown */
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const liveDone = !live.running && Object.keys(live.results).length > 1;
  const liveSummary = useMemo(() => {
    const docs = Object.values(live.results).flat();
    return {
      n: Object.keys(live.results).length,
      auto: docs.filter((d) => d.route === "auto").length,
      human: docs.filter((d) => d.route === "review" || d.route === "approval").length,
      ignored: docs.filter((d) => d.route === "ignore").length,
    };
  }, [live.results]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-[22px]">{t.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{t.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-nowrap">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            aria-label={t.upload}
          />
          <Button size="sm" icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()} disabled={!canProcess || live.running} loading={uploading} title={t.uploadHint}>
            {uploading ? t.uploading : t.upload}
          </Button>
          <Button
            size="sm"
            icon={<MailPlus className="size-4" />}
            onClick={simulate}
            disabled={!canProcess || live.running || data.simulationRemaining === 0 || pending}
            title={t.simulateHint}
          >
            {t.simulate}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={live.running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            disabled={!canProcess || live.running || pendingEmails.length === 0}
            onClick={() => processQueue(pendingEmails.map((e) => e.id).reverse())}
            className={cn(highlightProcess && "pulse-ring")}
          >
            {live.running ? t.processing : t.processAll}
            {!live.running && pendingEmails.length > 0 && <span className="tabular rounded bg-white/15 px-1.5 text-xs">{pendingEmails.length}</span>}
          </Button>
        </div>
      </div>

      {(live.running || liveDone) && (
        <LivePanel live={live} emails={data.emails} done={liveDone} summary={liveSummary} />
      )}

      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={(["all", "new", "review", "auto", "critical"] as Filter[]).map((k) => ({ value: k, label: t.filters[k], count: counts[k] }))}
        />
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPlaceholder} className="pl-9" aria-label={t.searchPlaceholder} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Card className={cn("overflow-hidden", mobileDetail && "hidden lg:block")} as="div">
          {visible.length === 0 ? (
            <EmptyState icon={<Inbox className="size-5" />} title={data.emails.length === 0 ? t.emptyAll : t.empty} />
          ) : (
            <ul className="divide-y divide-slate-100" aria-label={fmt(t.count, { n: visible.length })}>
              {visible.map((e) => (
                <EmailRow
                  key={e.id}
                  email={e}
                  selected={e.id === selectedId}
                  liveStep={live.currentId === e.id ? live.step : null}
                  onSelect={() => {
                    setSelectedId(e.id);
                    setMobileDetail(true);
                  }}
                />
              ))}
            </ul>
          )}
        </Card>
        <div className={cn(!mobileDetail && "hidden lg:block")}>
          <button className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600 lg:hidden" onClick={() => setMobileDetail(false)}>
            <ArrowLeft className="size-4" /> {t.title}
          </button>
          {selected ? (
            <EmailDetail
              email={selected}
              canProcess={canProcess && !live.running}
              liveStep={live.currentId === selected.id ? live.step : null}
              onProcess={() => processQueue([selected.id])}
            />
          ) : (
            <Card as="div">
              <EmptyState icon={<Inbox className="size-5" />} title={t.selectEmail} />
            </Card>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {live.running ? `${t.live.running} …` : ""}
      </p>
    </div>
  );
}

function LivePanel({ live, emails, done, summary }: { live: LiveState; emails: InboxEmail[]; done: boolean; summary: { n: number; auto: number; human: number; ignored: number } }) {
  const t = useT(inboxDict);
  const current = emails.find((e) => e.id === live.currentId);
  const progress = Object.keys(live.results).length / Math.max(1, live.order.length);
  return (
    <Card className="fade-in mb-4 overflow-hidden" as="div">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", done ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700")}>
            {done ? <Check className="size-4" /> : <Sparkles className="size-4" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {done ? t.live.done : t.live.title}
              {!done && (
                <span className="tabular ml-2 text-xs font-normal text-slate-500">
                  {Object.keys(live.results).length}/{live.order.length}
                </span>
              )}
            </p>
            <p className="truncate text-[13px] text-slate-500">
              {done ? fmt(t.live.summary, summary) : current ? `${t.live.running}: ${current.subject}` : "…"}
            </p>
          </div>
        </div>
        {done ? (
          <ButtonLink href="/app/review" variant="primary" size="sm">
            {t.live.cta} <ArrowRight className="size-4" />
          </ButtonLink>
        ) : (
          <ol className="flex flex-wrap items-center gap-1" aria-label={t.live.title}>
            {STEPS.map((s, i) => (
              <li
                key={s}
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors",
                  i < live.step ? "bg-emerald-50 text-emerald-700" : i === live.step ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-500",
                )}
              >
                {t.steps[s]}
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="h-0.5 bg-slate-100">
        <div className="h-full bg-violet-500 transition-[width] duration-300" style={{ width: `${(done ? 1 : progress) * 100}%` }} />
      </div>
      {!done && <p className="px-5 py-1.5 text-[11px] text-slate-500">{t.live.timingNote}</p>}
    </Card>
  );
}

function EmailRow({ email, selected, liveStep, onSelect }: { email: InboxEmail; selected: boolean; liveStep: number | null; onSelect: () => void }) {
  const t = useT(inboxDict);
  const d = useDomain();
  const f = useFormat();
  const lang = useLang();
  const isNew = email.status === "new";
  const main = email.documents.find((d) => d.docType && d.docType !== "other") ?? email.documents[0];
  const critical = email.documents.reduce((n, d) => n + d.critical, 0);
  const warnings = email.documents.reduce((n, d) => n + d.warnings, 0);
  return (
    <li>
      <button
        onClick={onSelect}
        aria-current={selected || undefined}
        className={cn("relative block w-full px-4 py-3 text-left transition-colors sm:px-5", selected ? "bg-navy-50/70" : "hover:bg-slate-50")}
      >
        {selected && <span className="absolute inset-y-0 left-0 w-0.5 bg-navy-700" />}
        <div className="flex items-baseline justify-between gap-3">
          <p className={cn("truncate text-sm", isNew ? "font-semibold text-slate-900" : "font-medium text-slate-700")}>
            {isNew && <span className="mr-1.5 inline-block size-1.5 -translate-y-0.5 rounded-full bg-blue-600" aria-hidden />}
            {email.source === "upload" ? `${t.fromUpload} · ${email.fromName}` : email.fromName}
          </p>
          <span className="tabular shrink-0 text-xs text-slate-500" title={f.dateTime(email.receivedAt)}>
            {f.time(email.receivedAt)}
          </span>
        </div>
        <p className={cn("mt-0.5 truncate text-[13px]", isNew ? "text-slate-800" : "text-slate-600")}>{email.subject}</p>
        {liveStep != null ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-violet-700">
            <Loader2 className="size-3.5 animate-spin" />
            {t.steps[STEPS[Math.min(liveStep, STEPS.length - 1)]]} …
          </p>
        ) : email.summary ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{email.summary[lang]}</p>
        ) : (
          <p className="mt-1 truncate text-xs text-slate-500">{email.body.replace(/\s+/g, " ").slice(0, 120)}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {email.status === "new" && <Badge tone="info">{t.notProcessed}</Badge>}
          {email.status === "error" && <Badge tone="danger">{d.emailStatus.error}</Badge>}
          {email.status === "processed" && main && (
            <>
              <DocTypeBadge type={main.docType} />
              <StatusBadge status={main.status} />
              {critical > 0 && (
                <Badge tone="danger" icon={<SeverityIcon severity="critical" className="size-3" />}>
                  {critical} {t.critical}
                </Badge>
              )}
              {critical === 0 && warnings > 0 && (
                <Badge tone="warning" icon={<SeverityIcon severity="warning" className="size-3" />}>
                  {warnings} {warnings === 1 ? t.warning1 : t.warnings}
                </Badge>
              )}
              <PriorityBadge priority={email.priority} />
            </>
          )}
          {email.documents.some((d) => d.fileName) && <Paperclip className="ml-auto size-3.5 text-slate-500" role="img" aria-label={t.hasAttachment} />}
        </div>
      </button>
    </li>
  );
}

function EmailDetail({ email, canProcess, liveStep, onProcess }: { email: InboxEmail; canProcess: boolean; liveStep: number | null; onProcess: () => void }) {
  const t = useT(inboxDict);
  const f = useFormat();
  const d = useDomain();
  const lang = useLang();
  const [showBody, setShowBody] = useState(false);
  useEffect(() => setShowBody(false), [email.id]);
  const processed = email.status === "processed";

  return (
    <Card className="overflow-hidden" as="article">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <h2 className="text-base leading-snug font-semibold text-slate-900">{email.subject}</h2>
        <p className="mt-1 text-[13px] text-slate-500">
          <span className="font-medium text-slate-700">{email.fromName}</span> &lt;{email.fromEmail}&gt; · {t.received} {f.dateTime(email.receivedAt)}
        </p>
      </div>

      {!processed && (
        <div className="px-4 py-4 sm:px-5">
          {liveStep != null ? (
            <div className="flex items-center gap-2 text-sm text-violet-700">
              <Loader2 className="size-4 animate-spin" /> {t.steps[STEPS[Math.min(liveStep, STEPS.length - 1)]]} …
            </div>
          ) : (
            <Callout
              tone={email.status === "error" ? "danger" : "info"}
              title={email.status === "error" ? (email.error ?? d.emailStatus.error) : t.notProcessed}
              action={
                <Button size="sm" variant="primary" onClick={onProcess} disabled={!canProcess} icon={<Play className="size-4" />}>
                  {t.processNow}
                </Button>
              }
            />
          )}
        </div>
      )}

      {processed && email.summary && (
        <div className="px-4 pt-4 sm:px-5">
          <div className="rounded-lg bg-violet-50/60 p-3.5 ring-1 ring-violet-100">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-violet-800 uppercase">
              <Sparkles className="size-3.5" /> {t.aiSummary}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-800">{email.summary[lang]}</p>
            <div className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">{t.nextStep}</p>
                <p className="font-medium text-slate-900">{email.nextAction?.[lang]}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t.department}</p>
                <p className="font-medium text-slate-900">{email.department ? d.department[email.department as keyof typeof d.department] : "—"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 sm:px-5">
        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{t.attachments}</p>
        <ul className="space-y-2.5">
          {email.documents.map((doc) => {
            const issues = (doc.issues ?? []).filter((i) => i.status === "open" && i.severity !== "info");
            return (
              <li key={doc.id} className="rounded-lg ring-1 ring-slate-200">
                <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                  <FileText className="size-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{doc.fileName ?? t.noAttachment}</span>
                  {processed && <DocTypeBadge type={doc.docType} />}
                  {processed && <StatusBadge status={doc.status} />}
                </div>
                {processed && doc.docType && doc.docType !== "other" && (
                  <div className="border-t border-slate-100 px-3 py-2.5">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-4">
                      <div className="min-w-0">
                        <dt className="text-xs text-slate-500">{d.fieldByType.documentNumber?.[doc.docType as DocType] ?? d.field.documentNumber}</dt>
                        <dd className="truncate font-medium text-slate-900">{doc.documentNumber ?? <span className="text-slate-500">{d.unknown}</span>}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-slate-500">{d.fieldByType.partyName?.[doc.docType as DocType] ?? d.field.partyName}</dt>
                        <dd className="truncate font-medium text-slate-900">{doc.partyName ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">{doc.grossAmount != null ? d.field.grossTotal : d.field.netTotal}</dt>
                        <dd className="tabular font-medium text-slate-900">{f.money(doc.grossAmount ?? doc.netAmount)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">{lang === "de" ? "Sicherheit" : "Confidence"}</dt>
                        <dd>{doc.confidence != null ? <ConfidenceBadge value={doc.confidence} compact /> : "—"}</dd>
                      </div>
                    </dl>
                    {issues.length > 0 && (
                      <ul className="mt-2.5 space-y-1.5">
                        {issues.slice(0, 3).map((i) => {
                          const txt = issueText(i, d, f, doc.docType as DocType);
                          return (
                            <li key={i.id} className="flex items-start gap-2 text-[13px] text-slate-700">
                              <SeverityIcon severity={i.severity} className="mt-0.5 size-3.5 shrink-0" />
                              <span>{txt.title}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
                {processed && (
                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-3 py-2">
                    <RouteBadge route={doc.route} />
                    <span className="flex-1" />
                    {doc.fileName && (
                      <a href={`/api/documents/${doc.id}/file`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-600 hover:text-slate-900">
                        {t.openPdf} <ExternalLink className="size-3.5" />
                      </a>
                    )}
                    {doc.docType !== "other" && (
                      <ButtonLink
                        href={`/app/documents/${doc.id}`}
                        size="xs"
                        variant={["needs_review", "needs_approval", "info_requested"].includes(doc.status) ? "primary" : "secondary"}
                      >
                        {["needs_review", "needs_approval", "info_requested"].includes(doc.status) ? t.openReview : t.openDocument}
                        <ArrowRight className="size-3.5" />
                      </ButtonLink>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
        <button onClick={() => setShowBody((v) => !v)} className="text-[13px] font-medium text-slate-600 hover:text-slate-900" aria-expanded={showBody}>
          {t.originalEmail} {showBody ? "▴" : "▾"}
        </button>
        {showBody && <pre className="mt-2 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-slate-700">{email.body || "—"}</pre>}
      </div>
    </Card>
  );
}
