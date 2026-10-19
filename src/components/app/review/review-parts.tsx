"use client";

import { Check, CheckCircle2, ExternalLink, Eye, FileText, RotateCcw, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fieldsForDocType, FIELD_KIND } from "@/domain/documents";
import type { DocType, Extraction, FieldKey, LineItem, ValidationIssue } from "@/domain/types";
import { fmt } from "@/i18n/core";
import { useDomain, useFormat, useLang, useT } from "@/i18n/client";
import { fieldLabel, issueText } from "@/i18n/domain";
import { reviewDict } from "@/i18n/ui/review";
import { cn } from "@/lib/cn";
import type { DocumentDetail } from "@/server/services/queries";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardHeader } from "../../ui/card";
import { Callout } from "../../ui/feedback";
import { Input } from "../../ui/form";
import { Segmented } from "../../ui/tabs";
import { Tooltip } from "../../ui/overlay";
import { ConfidenceBadge, SeverityIcon } from "../badges";

/* ---------- Document viewer ---------- */

export function DocumentViewer({ detail, highlight }: { detail: DocumentDetail; highlight: string | null }) {
  const t = useT(reviewDict);
  const { doc } = detail;
  const hasPdf = doc.hasFile;
  const [mode, setMode] = useState<"pdf" | "text">(hasPdf ? "pdf" : "text");
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlight) setMode("text");
  }, [highlight]);

  useEffect(() => {
    if (mode !== "text" || !highlight) return;
    const el = textRef.current?.querySelector("mark");
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [mode, highlight]);

  const text = doc.textContent ?? (detail.email?.body || "");
  const lines = text.split("\n");
  const needle = highlight?.trim() ?? "";

  return (
    <Card className="flex h-full flex-col overflow-hidden" as="div">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <Segmented
          value={mode}
          onChange={setMode}
          size="xs"
          options={[...(hasPdf ? [{ value: "pdf" as const, label: t.viewer.pdf }] : []), { value: "text" as const, label: t.viewer.text }]}
        />
        {hasPdf && (
          <a href={`/api/documents/${doc.id}/file`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900">
            {t.viewer.openTab} <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
      {doc.contentDeletedAt && <Callout tone="neutral" className="m-3">{t.viewer.deleted}</Callout>}
      {mode === "pdf" && hasPdf ? (
        <iframe title={doc.fileName ?? "PDF"} src={`/api/documents/${doc.id}/file#toolbar=0&navpanes=0&view=FitH`} className="min-h-[520px] w-full flex-1 bg-slate-100 lg:min-h-[640px]" />
      ) : (
        <div ref={textRef} className="max-h-[680px] min-h-[320px] flex-1 overflow-auto bg-slate-50/60 px-4 py-3">
          {!hasPdf && <p className="mb-2 text-xs text-slate-500">{t.viewer.noFile}</p>}
          {text.trim() ? (
            <pre className="font-mono text-[12px] leading-[1.7] whitespace-pre-wrap text-slate-700">
              {lines.map((line, i) => {
                const hit = needle && (line.includes(needle) || needle.includes(line.trim())) && line.trim().length > 2;
                return (
                  <div key={i} className={cn(hit && "-mx-1 px-1")}>
                    {hit ? <mark className="source-hit">{line.replace(/\t/g, "    ")}</mark> : line.replace(/\t/g, "    ") || " "}
                  </div>
                );
              })}
            </pre>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center text-sm text-slate-500">
              <FileText className="size-6 text-slate-300" />
              {t.viewer.noText}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ---------- Findings ---------- */

export function IssuesPanel({
  issues,
  docType,
  editable,
  canAcceptCritical,
  onAccept,
  onResolve,
  onReopen,
  onFocusLine,
  busy,
}: {
  issues: ValidationIssue[];
  docType: DocType;
  editable: boolean;
  canAcceptCritical: boolean;
  onAccept: (issue: ValidationIssue) => void;
  onResolve: (issue: ValidationIssue) => void;
  onReopen: (issue: ValidationIssue) => void;
  onFocusLine: (issue: ValidationIssue) => void;
  busy: boolean;
}) {
  const t = useT(reviewDict);
  const d = useDomain();
  const f = useFormat();
  const relevant = issues.filter((i) => i.code !== "LOW_CONFIDENCE");
  const sorted = [...relevant].sort((a, b) => rank(a) - rank(b));
  const lowConf = issues.filter((i) => i.code === "LOW_CONFIDENCE" && i.status === "open");
  return (
    <Card as="div">
      <CardHeader
        title={t.findings}
        icon={<ShieldAlert className="size-4" />}
        actions={
          relevant.length > 0 && (
            <span className="text-xs text-slate-500">{fmt(t.openOf, { open: relevant.filter((i) => i.status === "open").length, total: relevant.length })}</span>
          )
        }
      />
      <div className="divide-y divide-slate-100">
        {sorted.length === 0 && (
          <div className="flex items-center gap-2 px-5 py-4 text-sm text-emerald-800">
            <CheckCircle2 className="size-4 text-emerald-600" /> {t.noFindings}
          </div>
        )}
        {sorted.map((issue) => {
          const txt = issueText(issue, d, f, docType);
          const open = issue.status === "open";
          const criticalLocked = issue.severity === "critical" && !canAcceptCritical;
          return (
            <div key={issue.id} className={cn("px-4 py-3.5 sm:px-5", !open && "bg-slate-50/70")}>
              <div className="flex items-start gap-2.5">
                <SeverityIcon severity={issue.severity} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onFocusLine(issue)}
                      className={cn("text-left text-sm font-semibold hover:underline", open ? "text-slate-900" : "text-slate-500 line-through decoration-slate-300")}
                    >
                      {txt.title}
                    </button>
                    {issue.amountAtRisk != null && issue.amountAtRisk > 0 && open && <Badge tone="neutral">{f.money(issue.amountAtRisk)}</Badge>}
                    {!open && (
                      <Badge tone={issue.status === "accepted" ? "warning" : "success"} icon={<Check className="size-3" />}>
                        {fmt(issue.status === "accepted" ? t.accepted : t.resolved, { by: issue.resolution?.by ?? "" })}
                      </Badge>
                    )}
                  </div>
                  {open && (
                    <dl className="mt-1.5 space-y-1.5 text-[13px] leading-relaxed">
                      <div>
                        <dt className="inline font-medium text-slate-700">{t.whyMatters}: </dt>
                        <dd className="inline text-slate-600">{txt.why}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-slate-700">{t.recommendation}: </dt>
                        <dd className="inline text-slate-600">{txt.recommendation}</dd>
                      </div>
                    </dl>
                  )}
                  {!open && issue.resolution?.note && <p className="mt-1 text-[13px] text-slate-600">„{issue.resolution.note}“</p>}
                  {editable && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {open ? (
                        <>
                          <Tooltip content={criticalLocked ? t.criticalOnlyManager : null}>
                            <span>
                              <Button size="xs" onClick={() => onAccept(issue)} disabled={busy || criticalLocked}>
                                {t.accept}
                              </Button>
                            </span>
                          </Tooltip>
                          {issue.severity !== "critical" && (
                            <Button size="xs" variant="ghost" onClick={() => onResolve(issue)} disabled={busy}>
                              {t.resolve}
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button size="xs" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={() => onReopen(issue)} disabled={busy}>
                          {t.reopen}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {lowConf.length > 0 && (
          <div className="px-4 py-3 text-[13px] text-slate-600 sm:px-5">
            <span className="font-medium text-slate-700">{d.severity.info}: </span>
            {lowConf.map((i) => issueText(i, d, f, docType).title).join(" · ")}
          </div>
        )}
      </div>
    </Card>
  );
}

const rank = (i: ValidationIssue) => (i.status !== "open" ? 3 : i.severity === "critical" ? 0 : i.severity === "warning" ? 1 : 2);

/* ---------- Fields ---------- */

export function toInputValue(key: FieldKey, value: string | null, lang: "de" | "en"): string {
  if (value == null) return "";
  if (FIELD_KIND[key] === "money" && lang === "de") return Number(value).toFixed(2).replace(".", ",");
  return value;
}

export function FieldsPanel({
  extraction,
  editable,
  edits,
  confirms,
  onEdit,
  onConfirm,
  onShowSource,
  activeSource,
  issues,
}: {
  extraction: Extraction;
  editable: boolean;
  edits: Partial<Record<FieldKey, string>>;
  confirms: FieldKey[];
  onEdit: (key: FieldKey, value: string) => void;
  onConfirm: (key: FieldKey) => void;
  onShowSource: (source: string | null) => void;
  activeSource: string | null;
  issues: ValidationIssue[];
}) {
  const t = useT(reviewDict);
  const d = useDomain();
  const f = useFormat();
  const lang = useLang();
  const keys = fieldsForDocType(extraction.docType);
  const flagged = new Set(issues.filter((i) => i.status === "open" && i.field && i.code !== "LOW_CONFIDENCE").map((i) => i.field));
  const display = (key: FieldKey, value: string | null) => {
    if (value == null) return null;
    switch (FIELD_KIND[key]) {
      case "money":
        return f.money(Number(value));
      case "date":
        return f.date(value);
      case "percent":
        return `${f.number(Number(value), Number(value) % 1 ? 1 : 0)} %`;
      case "iban":
        return value.replace(/(.{4})/g, "$1 ").trim();
      default:
        return value;
    }
  };
  return (
    <Card as="div">
      <CardHeader title={t.fields} />
      <dl className="divide-y divide-slate-100">
        {keys.map((key) => {
          const field = extraction.fields[key];
          const value = field?.value ?? null;
          const kind = FIELD_KIND[key];
          const edited = edits[key] !== undefined;
          const status = field?.status ?? "missing";
          const confirmed = status === "confirmed" || confirms.includes(key);
          const isFlagged = flagged.has(key);
          const lowConf = status === "extracted" && value != null && (field?.confidence ?? 1) < 0.9;
          return (
            <div key={key} className={cn("grid gap-1.5 px-4 py-2.5 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center sm:px-5", isFlagged && "bg-amber-50/50")}>
              <dt className="flex items-center gap-1.5 text-[13px] text-slate-500">
                {fieldLabel(d, key, extraction.docType)}
                {isFlagged && <span className="size-1.5 rounded-full bg-amber-500" aria-label="Abweichung" />}
              </dt>
              <dd className="min-w-0">
                {editable ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type={kind === "date" ? "date" : "text"}
                      inputMode={kind === "money" || kind === "percent" ? "decimal" : undefined}
                      value={edited ? edits[key]! : toInputValue(key, value, lang)}
                      placeholder={value == null ? t.notRecognised : undefined}
                      onChange={(e) => onEdit(key, e.target.value)}
                      className={cn("h-8 text-[13px]", value == null && !edited && "ring-red-300 placeholder:text-red-400", edited && "ring-blue-400")}
                      aria-label={fieldLabel(d, key, extraction.docType)}
                    />
                    <FieldMeta
                      field={field}
                      edited={edited}
                      confirmed={confirmed}
                      lowConf={lowConf}
                      onConfirm={() => onConfirm(key)}
                      onSource={() => onShowSource(field?.source ?? null)}
                      sourceActive={!!field?.source && activeSource === field.source}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm", value == null ? "text-red-600" : "font-medium text-slate-900")}>{display(key, value) ?? t.notRecognised}</span>
                    <FieldMeta field={field} edited={false} confirmed={confirmed} lowConf={false} onSource={() => onShowSource(field?.source ?? null)} sourceActive={!!field?.source && activeSource === field.source} />
                  </div>
                )}
                {(status === "corrected" || (field?.originalValue !== undefined && field?.originalValue !== value)) && field?.originalValue !== undefined && (
                  <p className="mt-1 text-xs text-slate-500">
                    {t.original}: <span className="line-through">{display(key, field.originalValue ?? null) ?? "—"}</span>
                  </p>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </Card>
  );
}

function FieldMeta({
  field,
  edited,
  confirmed,
  lowConf,
  onConfirm,
  onSource,
  sourceActive,
}: {
  field: Extraction["fields"][FieldKey];
  edited: boolean;
  confirmed: boolean;
  lowConf: boolean;
  onConfirm?: () => void;
  onSource: () => void;
  sourceActive: boolean;
}) {
  const t = useT(reviewDict);
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {field?.status === "corrected" && !edited ? (
        <Badge tone="info">{t.corrected}</Badge>
      ) : confirmed ? (
        <Badge tone="success" icon={<Check className="size-3" />}>
          {t.confirmedLabel}
        </Badge>
      ) : field && field.value != null ? (
        <ConfidenceBadge value={field.confidence} compact />
      ) : (
        <ConfidenceBadge value={0} compact />
      )}
      {lowConf && !confirmed && onConfirm && (
        <Tooltip content={t.confirmValue}>
          <button type="button" onClick={onConfirm} className="rounded-md p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700" aria-label={t.confirmValue}>
            <Check className="size-3.5" />
          </button>
        </Tooltip>
      )}
      {field?.source && (
        <Tooltip content={t.fieldSource}>
          <button
            type="button"
            onClick={onSource}
            className={cn("rounded-md p-1 hover:bg-slate-100", sourceActive ? "text-amber-600" : "text-slate-400 hover:text-slate-700")}
            aria-label={t.fieldSource}
          >
            <Eye className="size-3.5" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}

/* ---------- Line items ---------- */

export function LineItemsPanel({
  extraction,
  comparison,
  editable,
  edits,
  onEdit,
  issues,
  focusLine,
  onShowSource,
}: {
  extraction: Extraction;
  comparison: DocumentDetail["comparison"];
  editable: boolean;
  edits: Record<string, string>;
  onEdit: (index: number, field: keyof LineItem, value: string) => void;
  issues: ValidationIssue[];
  focusLine: number | null;
  onShowSource: (s: string | null) => void;
}) {
  const t = useT(reviewDict);
  const d = useDomain();
  const f = useFormat();
  const lang = useLang();
  const items = extraction.lineItems;
  const issueLines = useMemo(() => new Map(issues.filter((i) => i.status === "open" && i.lineIndex != null).map((i) => [i.lineIndex!, i])), [issues]);
  if (items.length === 0) return null;
  const isCustomer = extraction.docType === "purchase_order" || extraction.docType === "rfq";
  const numCell = (i: number, field: "quantity" | "unitPrice" | "total", value: number | null, decimals: number) => {
    const key = `${i}:${field}`;
    if (editable)
      return (
        <input
          value={edits[key] ?? (value == null ? "" : lang === "de" ? value.toFixed(decimals).replace(".", ",") : value.toFixed(decimals))}
          onChange={(e) => onEdit(i, field, e.target.value)}
          inputMode="decimal"
          className={cn("tabular h-7 w-full min-w-20 rounded-md border-0 bg-white px-1.5 text-right text-[13px] ring-1 ring-slate-200 ring-inset focus:ring-2 focus:ring-blue-600 focus:outline-none", edits[key] !== undefined && "ring-blue-400")}
          aria-label={`${d.lineItem[field]} ${items[i].pos}`}
        />
      );
    return <span className="tabular">{value == null ? "—" : field === "quantity" ? f.number(value, decimals) : f.money(value)}</span>;
  };
  return (
    <Card as="div">
      <CardHeader title={`${t.lineItems} (${items.length})`} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
              <th className="px-4 py-2 font-medium sm:px-5">{d.lineItem.pos}</th>
              <th className="px-2 py-2 font-medium">{d.lineItem.articleNo}</th>
              <th className="px-2 py-2 font-medium">{d.lineItem.description}</th>
              <th className="px-2 py-2 text-right font-medium">{d.lineItem.quantity}</th>
              <th className="px-2 py-2 text-right font-medium">{d.lineItem.unitPrice}</th>
              <th className="px-4 py-2 text-right font-medium sm:px-5">{d.lineItem.total}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((li, i) => {
              const issue = issueLines.get(i);
              const cmp = comparison.lines[i];
              const priceDiff = cmp?.expectedPrice != null && li.unitPrice != null && Math.abs(cmp.expectedPrice - li.unitPrice) > 0.005;
              const qtyDiff = cmp?.expectedQty != null && li.quantity != null && cmp.expectedQty !== li.quantity;
              return (
                <tr
                  key={i}
                  className={cn("border-b border-slate-50 align-top last:border-0", issue && (issue.severity === "critical" ? "bg-red-50/60" : "bg-amber-50/60"), focusLine === i && "ring-2 ring-amber-300 ring-inset")}
                >
                  <td className="px-4 py-2 font-medium whitespace-nowrap text-slate-700 sm:px-5">
                    <button type="button" onClick={() => onShowSource(li.source ?? null)} className="hover:underline">
                      {li.pos}
                    </button>
                    <span className="mt-1 block">{li.corrected ? <Badge tone="info">{t.corrected}</Badge> : <ConfidenceBadge value={li.confidence} compact />}</span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="font-mono text-xs text-slate-700">{li.articleNo ?? "—"}</span>
                    {cmp?.matchedArticle && cmp.matchedArticle !== li.articleNo && <span className="block text-[11px] text-slate-400">→ {cmp.matchedArticle}</span>}
                    {!cmp?.matchedArticle && li.articleNo && <span className="block text-[11px] text-amber-700">{t.compare.notMatched}</span>}
                  </td>
                  <td className="max-w-[220px] px-2 py-2 text-slate-700">{li.description ?? "—"}</td>
                  <td className="px-2 py-2 text-right">
                    {numCell(i, "quantity", li.quantity, 0)}
                    <span className="ml-1 text-xs text-slate-400">{li.unit}</span>
                    {qtyDiff && !isCustomer && (
                      <span className="block text-[11px] text-amber-700">
                        {t.expected}: {f.number(cmp!.expectedQty!)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {numCell(i, "unitPrice", li.unitPrice, 2)}
                    {cmp?.expectedPrice != null && (priceDiff || isCustomer) && (
                      <span className={cn("block text-[11px]", priceDiff ? "text-amber-700" : "text-slate-400")}>
                        {t.compare.priceSource[cmp.priceSource ?? "list"]}: {f.money(cmp.expectedPrice)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900 sm:px-5">{numCell(i, "total", li.total, 2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ---------- Comparison ---------- */

export function ComparePanel({ detail }: { detail: DocumentDetail }) {
  const t = useT(reviewDict);
  const f = useFormat();
  const d = useDomain();
  const { comparison } = detail;
  const x = detail.doc.extraction;
  const isSupplier = x && !["purchase_order", "rfq"].includes(x.docType);
  return (
    <div className="space-y-4">
      <Card as="div">
        <CardHeader title={t.compare.party} />
        <div className="px-4 py-3 text-sm sm:px-5">
          {comparison.party ? (
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">{comparison.party.number}</dt>
                <dd className="font-medium text-slate-900">{comparison.party.name}</dd>
                <dd className="text-slate-600">{comparison.party.address}</dd>
              </div>
              {comparison.party.iban && (
                <div>
                  <dt className="text-xs text-slate-500">{t.compare.iban}</dt>
                  <dd className="font-mono text-[13px] text-slate-900">{comparison.party.iban.replace(/(.{4})/g, "$1 ")}</dd>
                  <dt className="mt-1.5 text-xs text-slate-500">{t.compare.phone}</dt>
                  <dd className="text-slate-900">{comparison.party.phone}</dd>
                </div>
              )}
              {comparison.party.paymentTerms && (
                <div>
                  <dt className="text-xs text-slate-500">{t.compare.terms}</dt>
                  <dd className="text-slate-900">{comparison.party.paymentTerms}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-slate-500">{t.compare.noParty}</p>
          )}
        </div>
      </Card>
      {isSupplier && (
        <Card as="div">
          <CardHeader title={t.compare.reference} />
          <div className="px-4 py-3 text-sm sm:px-5">
            {comparison.reference ? (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">{d.field.referenceNumber}</dt>
                  <dd className="font-medium">{comparison.reference.number}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{d.field.documentDate}</dt>
                  <dd>{f.date(comparison.reference.date)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{t.compare.requested}</dt>
                  <dd>{f.date(comparison.reference.requestedDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Status</dt>
                  <dd>{comparison.reference.status}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-slate-500">{t.compare.noReference}</p>
            )}
          </div>
        </Card>
      )}
      {x && x.lineItems.length > 0 && (
        <Card as="div">
          <CardHeader title={t.compare.lines} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-4 py-2 font-medium sm:px-5">{d.lineItem.pos}</th>
                  <th className="px-2 py-2 font-medium">{d.lineItem.articleNo}</th>
                  <th className="px-2 py-2 text-right font-medium">
                    {t.compare.doc}: {d.lineItem.quantity} / {d.lineItem.unitPrice}
                  </th>
                  <th className="px-4 py-2 text-right font-medium sm:px-5">
                    {t.compare.master}: {d.lineItem.quantity} / {d.lineItem.unitPrice}
                  </th>
                </tr>
              </thead>
              <tbody>
                {x.lineItems.map((li, i) => {
                  const c = comparison.lines[i];
                  const priceDiff = c?.expectedPrice != null && li.unitPrice != null && Math.abs(c.expectedPrice - li.unitPrice) > 0.005;
                  const qtyDiff = c?.expectedQty != null && li.quantity != null && c.expectedQty !== li.quantity;
                  return (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2 sm:px-5">{li.pos}</td>
                      <td className="px-2 py-2">
                        <span className="font-mono text-xs">{li.articleNo}</span>
                        <span className="block text-xs text-slate-500">{c?.description ?? t.compare.notMatched}</span>
                      </td>
                      <td className="tabular px-2 py-2 text-right">
                        {f.number(li.quantity)} / {li.unitPrice != null ? f.money(li.unitPrice) : "—"}
                      </td>
                      <td className="tabular px-4 py-2 text-right sm:px-5">
                        <span className={cn(qtyDiff && "font-semibold text-amber-700")}>{c?.expectedQty != null ? f.number(c.expectedQty) : "—"}</span>
                        {" / "}
                        <span className={cn(priceDiff && "font-semibold text-amber-700")}>{c?.expectedPrice != null ? f.money(c.expectedPrice) : "—"}</span>
                        {c?.priceSource && <span className="block text-[11px] text-slate-400">{t.compare.priceSource[c.priceSource]}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
