"use client";

import { ArrowRight, Bot, Download, FileSpreadsheet, Lock, Plug } from "lucide-react";
import Link from "next/link";
import { fmt } from "@/i18n/core";
import { useFormat, useLang, useT } from "@/i18n/client";
import { integrationsDict } from "@/i18n/ui/ops";
import { cn } from "@/lib/cn";
import type { IntegrationCategory, IntegrationInfo, IntegrationStatus } from "@/server/integrations/registry";
import { Badge, type Tone } from "../../ui/badge";
import { ButtonLink } from "../../ui/button";
import { Card, CardHeader, KeyValue, PageHeader } from "../../ui/card";
import { Callout, EmptyState } from "../../ui/feedback";

const STATUS_TONE: Record<IntegrationStatus, Tone> = {
  active_demo: "info",
  active: "success",
  implemented_needs_config: "warning",
  planned: "outline",
};

const CATEGORY_ORDER: IntegrationCategory[] = ["mail", "erp", "ai", "accounting", "ocr", "storage", "messaging", "identity", "export"];

const DOT: Record<IntegrationStatus, string> = {
  active_demo: "bg-sky-500",
  active: "bg-emerald-500",
  implemented_needs_config: "bg-amber-500",
  planned: "bg-slate-400",
};
const STATUS_ORDER: IntegrationStatus[] = ["active_demo", "active", "implemented_needs_config", "planned"];

interface ErpRow {
  id: string;
  documentId: string;
  kind: string;
  externalRef: string;
  payload: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
}

export function IntegrationsView({
  catalogue,
  provider,
  erp,
}: {
  catalogue: IntegrationInfo[];
  provider: { id: string; label: string; requested: string; fallbackReason: string | null; demoForced: boolean };
  erp: ErpRow[];
}) {
  const t = useT(integrationsDict);
  const lang = useLang();
  const categories = CATEGORY_ORDER.filter((c) => catalogue.some((i) => i.category === c));

  return (
    <div>
      <PageHeader title={t.title} description={t.description} />

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card as="div">
          <CardHeader title={t.providerTitle} icon={<Bot className="size-4" />} />
          <dl className="px-4 py-2 sm:px-5">
            <KeyValue label={t.providerActive}>{provider.label}</KeyValue>
            <KeyValue label={t.providerRequested}>
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">{provider.requested}</code>
            </KeyValue>
          </dl>
          <div className="space-y-2 px-4 pb-4 sm:px-5">
            {provider.demoForced && <Callout tone="info">{t.providerDemo}</Callout>}
            {provider.fallbackReason && <Callout tone="warning">{fmt(t.providerFallback, { reason: provider.fallbackReason })}</Callout>}
          </div>
        </Card>
        <Callout tone="neutral" title={t.principleTitle} icon={<Lock className="size-4 text-slate-500" />} className="h-full">
          {t.principleText}
        </Callout>
      </div>

      <Card className="mb-6" as="div">
        <CardHeader title={t.legend} />
        <dl className="grid gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-4">
          {STATUS_ORDER.map((s) => (
            <div key={s}>
              <dt className="flex items-start gap-2 text-[13px] font-semibold text-slate-900">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[s])} aria-hidden />
                {t.status[s]}
              </dt>
              <dd className="mt-1 text-[13px] leading-snug text-slate-600">{t.statusText[s]}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="grid gap-x-3 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const wide = catalogue.filter((i) => i.category === category).length > 1;
          return (
          <section key={category} aria-labelledby={`int-${category}`} className={cn("flex flex-col", wide && "md:col-span-2 xl:col-span-3")}>
            <h2 id={`int-${category}`} className="mb-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              {t.categories[category]}
            </h2>
            <div className={cn("grid flex-1 gap-3", wide && "md:grid-cols-2 xl:grid-cols-3")}>
              {catalogue
                .filter((i) => i.category === category)
                .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
                .map((item) => (
                  <Card key={item.id} as="article" className={cn("flex flex-col", item.status === "planned" && "bg-slate-50/40")}>
                    <div className="flex-1 px-4 py-3.5">
                      <h3 className="flex items-start gap-2 text-sm font-semibold text-slate-900">
                        <Plug className="mt-0.5 size-4 shrink-0 text-slate-400" />
                        {item.name}
                      </h3>
                      <div className="mt-1.5">
                        <Badge tone={STATUS_TONE[item.status]} dot>
                          {t.status[item.status]}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{item.description[lang]}</p>
                    </div>
                    <div className="border-t border-slate-100 px-4 py-3">
                      <p className="text-xs font-medium text-slate-500">{t.requirements}</p>
                      {item.requirements.length > 0 ? (
                        <ul className="mt-1 space-y-1 text-[13px] text-slate-700">
                          {item.requirements.map((r) => (
                            <li key={r.de} className="flex gap-1.5">
                              <span className="text-slate-500">•</span>
                              <span>{r[lang]}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-[13px] text-slate-500">{t.noRequirements}</p>
                      )}
                      {item.id === "csv_export" && (
                        <div className="mt-2.5">
                          <ButtonLink download href="/api/export/documents" size="xs" icon={<Download className="size-3.5" />}>
                            {t.exportButton}
                          </ButtonLink>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
            </div>
          </section>
          );
        })}
      </div>

      <ErpRecords rows={erp} />
    </div>
  );
}

function ErpRecords({ rows }: { rows: ErpRow[] }) {
  const t = useT(integrationsDict);
  const f = useFormat();
  const mode = (row: ErpRow) => (row.payload?.releasedBy === "auto" ? t.mode.auto : t.mode.approved);
  return (
    <Card className="mt-6 overflow-hidden" as="section">
      <CardHeader title={t.erpTitle} description={t.erpDescription} icon={<FileSpreadsheet className="size-4" />} />
      {rows.length === 0 ? (
        <EmptyState title={t.erpEmpty} text={t.erpEmptyText} action={<ButtonLink href="/app/inbox" size="sm">{t.open}</ButtonLink>} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-3 sm:px-5">
              <div className="grid gap-2 text-[13px] sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="font-mono text-[13px] font-semibold text-slate-900">{row.externalRef}</p>
                  <p className="text-xs text-slate-500">{t.kinds[row.kind] ?? row.kind}</p>
                </div>
                <div className="min-w-0 text-slate-700">
                  <p className="truncate">
                    {String((row.payload?.partner as { name?: string } | undefined)?.name ?? "—")}
                    {row.payload?.documentNumber ? ` · ${String(row.payload.documentNumber)}` : ""}
                  </p>
                  {typeof row.payload?.netAmount === "number" && <p className="tabular text-xs text-slate-500">{f.money(row.payload.netAmount)}</p>}
                </div>
                <div className="min-w-0 text-slate-600">
                  <p className="truncate">
                    {row.createdBy} · {mode(row)}
                  </p>
                  <p className="tabular text-xs text-slate-500">{f.dateTime(row.createdAt)}</p>
                </div>
                <Link href={`/app/documents/${row.documentId}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-blue-700 hover:underline">
                  {t.columns.document} <ArrowRight className="size-3.5" />
                </Link>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-800">{t.payload}</summary>
                <pre tabIndex={0} aria-label={t.payload} className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-100">{JSON.stringify(row.payload, null, 2)}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
