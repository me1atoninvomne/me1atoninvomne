"use client";

import { ArrowRight, Bot, FileText, Mail, RotateCcw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FIELD_KIND } from "@/domain/documents";
import type { DocType, FieldKey, IssueCode, RouteReason, Severity } from "@/domain/types";
import { fmt } from "@/i18n/core";
import { useDomain, useFormat, useLang, useT } from "@/i18n/client";
import { fieldLabel, issueText, reasonText } from "@/i18n/domain";
import { marketingDict } from "@/i18n/ui/marketing";
import { cn } from "@/lib/cn";
import { ConfidenceBadge, DocTypeBadge, RouteBadge, SeverityIcon } from "../app/badges";
import { Button, ButtonLink } from "../ui/button";
import { Callout, Skeleton } from "../ui/feedback";

const SAMPLES = ["po_price_mismatch", "inv_iban_changed", "delay_critical", "po_clean"] as const;
type SampleKey = (typeof SAMPLES)[number];

interface SampleResult {
  email: { from: string; subject: string; fileName: string };
  docType: DocType;
  docTypeConfidence: number;
  fields: { key: FieldKey; value: string | null; confidence: number }[];
  lineItems: unknown[];
  issues: { code: IssueCode; severity: Severity; params: Record<string, string | number | null> }[];
  routing: { route: "auto" | "review" | "approval" | "ignore"; reasons: RouteReason[]; confidence: number; requiredRole: string | null };
  ruleNames: Record<string, { de: string; en: string }>;
  trace: { step: string; ms: number }[];
}

export function SampleDemo() {
  const t = useT(marketingDict).sample;
  const d = useDomain();
  const f = useFormat();
  const lang = useLang();
  const [key, setKey] = useState<SampleKey>("po_price_mismatch");
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; data?: SampleResult }>({ status: "loading" });

  const load = useCallback(async (k: SampleKey) => {
    setState((s) => ({ status: "loading", data: s.data }));
    try {
      const res = await fetch("/api/public/analyze-sample", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: k }) });
      if (!res.ok) throw new Error(String(res.status));
      setState({ status: "ready", data: (await res.json()) as SampleResult });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    load(key);
  }, [key, load]);

  const data = state.data;
  const format = (k: FieldKey, v: string | null) => {
    if (v == null) return null;
    switch (FIELD_KIND[k]) {
      case "money":
        return f.money(Number(v));
      case "date":
        return f.date(v);
      case "percent":
        return `${v} %`;
      case "iban":
        return v.replace(/(.{4})/g, "$1 ").trim();
      default:
        return v;
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label={t.title}>
        {SAMPLES.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={key === s}
            onClick={() => setKey(s)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-colors ring-inset",
              key === s ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
            )}
          >
            {t.samples[s]}
          </button>
        ))}
      </div>

      {state.status === "error" ? (
        <Callout
          tone="danger"
          title={t.error}
          action={
            <Button size="sm" onClick={() => load(key)} icon={<RotateCcw className="size-4" />}>
              {t.retry}
            </Button>
          }
        />
      ) : !data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : (
        <div className={cn("grid grid-cols-1 gap-4 transition-opacity lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]", state.status === "loading" && "opacity-60")} aria-busy={state.status === "loading"}>
          {/* Left: input + extraction */}
          <div className="space-y-4">
            <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <Mail className="size-3.5" /> {t.email}
              </p>
              <p className="mt-2 text-sm font-medium break-words text-slate-900">{data.email.subject}</p>
              <p className="mt-0.5 text-[13px] break-words text-slate-500">{data.email.from}</p>
              <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                <FileText className="size-3.5" /> {data.email.fileName}
              </p>
            </div>
            <div className="rounded-xl bg-white ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{t.fields}</p>
                <span className="flex items-center gap-1.5">
                  <DocTypeBadge type={data.docType} />
                  <ConfidenceBadge value={data.docTypeConfidence} compact />
                </span>
              </div>
              <dl className="divide-y divide-slate-100">
                {data.fields.map((fl) => (
                  <div key={fl.key} className="flex items-baseline justify-between gap-3 px-4 py-2">
                    <dt className="shrink-0 text-[13px] text-slate-500">{fieldLabel(d, fl.key, data.docType)}</dt>
                    <dd className="flex min-w-0 items-baseline gap-2 text-right">
                      {fl.value == null ? (
                        <span className="text-[13px] text-slate-400 italic">{t.notFound}</span>
                      ) : (
                        <span className="truncate text-[13px] font-medium text-slate-900">{format(fl.key, fl.value)}</span>
                      )}
                      <ConfidenceBadge value={fl.value == null ? 0 : fl.confidence} compact />
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">{fmt(t.lineItems, { n: data.lineItems.length })}</p>
            </div>
          </div>

          {/* Right: validation + decision */}
          <div className="space-y-4">
            <div className="rounded-xl bg-white ring-1 ring-slate-200">
              <p className="border-b border-slate-100 px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">{t.findings}</p>
              {data.issues.length === 0 ? (
                <p className="px-4 py-4 text-sm text-emerald-800">{t.noFindings}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.issues.map((i, idx) => {
                    const txt = issueText(i, d, f, data.docType);
                    return (
                      <li key={idx} className="flex gap-2.5 px-4 py-3">
                        <SeverityIcon severity={i.severity} className="mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{txt.title}</p>
                          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{txt.why}</p>
                          <p className="mt-1 text-[13px] leading-relaxed text-slate-800">
                            <span className="font-medium">→ </span>
                            {txt.recommendation}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className={cn("rounded-xl p-4 ring-1", data.routing.route === "auto" ? "bg-emerald-50/60 ring-emerald-200" : "bg-violet-50/60 ring-violet-200")}>
              <div className="flex flex-wrap items-center gap-2">
                {data.routing.route === "auto" ? <Bot className="size-4 text-emerald-700" /> : <ShieldCheck className="size-4 text-violet-700" />}
                <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase">{t.decision}</p>
                <RouteBadge route={data.routing.route} />
              </div>
              <ul className="mt-2 space-y-1 text-[13px] text-slate-700">
                {data.routing.reasons
                  .filter((r) => r.code !== "RULE_CONTINUE" || data.routing.route === "auto")
                  .map((r, idx) => (
                    <li key={idx} className="flex gap-1.5">
                      <span className="text-slate-400">•</span>
                      {reasonText(r, d, f, (id) => data.ruleNames[id]?.[lang] ?? id)}
                    </li>
                  ))}
              </ul>
            </div>
            <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{t.steps}</p>
              <ol className="mt-2 flex flex-wrap gap-1.5">
                {data.trace.map((s, idx) => (
                  <li key={idx} className="tabular inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                    <span className="font-medium text-slate-800">{t.stepNames[s.step] ?? s.step}</span>
                    <span className="text-slate-400">{s.ms < 1 ? "<1" : f.number(s.ms, s.ms < 10 ? 1 : 0)} ms</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-slate-500">{t.disclaimer}</p>
              <ButtonLink href="/demo" variant="primary" size="sm" className="self-start sm:self-auto">
                {t.more} <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
          </div>
          {state.status === "loading" && (
            <p className="sr-only" aria-live="polite">
              {t.loading}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
