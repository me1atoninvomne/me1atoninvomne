"use client";

import { ArrowRight, Bot, Check, ChevronRight, Copy, Forward, MessageSquareText, ShieldCheck, ThumbsDown, UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FIELD_KIND } from "@/domain/documents";
import { parseGermanNumber } from "@/domain/parse";
import type { DocType, FieldKey, ValidationIssue } from "@/domain/types";
import { fmt } from "@/i18n/core";
import { useDomain, useFormat, useLang, useT } from "@/i18n/client";
import { reasonText } from "@/i18n/domain";
import { reviewDict } from "@/i18n/ui/review";
import { useMutation } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { comfortStorage } from "@/lib/comfort-storage";
import type { DocumentDetail } from "@/server/services/queries";
import { Badge } from "../../ui/badge";
import { Button, ButtonLink } from "../../ui/button";
import { Card, CardHeader } from "../../ui/card";
import { Callout } from "../../ui/feedback";
import { Label, Select, Textarea } from "../../ui/form";
import { Dialog, Tooltip } from "../../ui/overlay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { useToast } from "../../ui/toast";
import { ConfidenceBadge, DocTypeBadge, PriorityBadge, RouteBadge, StatusBadge } from "../badges";
import { AuditTimeline } from "../timeline";
import { ComparePanel, DocumentViewer, FieldsPanel, IssuesPanel, LineItemsPanel } from "./review-parts";

const EDITABLE = ["needs_review", "needs_approval", "info_requested"];
const STAGE_LABEL: Record<string, { de: string; en: string }> = {
  purchase_order: { de: "Auftragsentwurf", en: "Sales order draft" },
  order_confirmation: { de: "Bestätigung zur Bestellung", en: "Purchase order confirmation" },
  delivery_note: { de: "Wareneingang (vorbereitet)", en: "Goods receipt (prepared)" },
  invoice: { de: "Rechnungsvorerfassung (keine Zahlung)", en: "Invoice pre-entry (no payment)" },
  delay_notice: { de: "Terminänderung zur Bestellung", en: "Purchase order date change" },
};

interface Permissions {
  edit: boolean;
  approve: boolean;
  reject: boolean;
  handover: boolean;
  acceptCritical: boolean;
}

type DialogKind = null | "approve" | "reject" | "info" | "handover" | { accept: ValidationIssue };

export function ReviewView({ detail, nextId, permissions, currentUserId }: { detail: DetailProp; nextId: string | null; permissions: Permissions; currentUserId: string }) {
  const t = useT(reviewDict);
  const d = useDomain();
  const f = useFormat();
  const lang = useLang();
  const router = useRouter();
  const { push } = useToast();
  const { run, pending } = useMutation();
  const { doc } = detail;
  const x = doc.extraction;
  const docType = (doc.docType ?? "other") as DocType;
  const editable = EDITABLE.includes(doc.status) && permissions.edit && !!x;
  const issues = doc.issues ?? [];

  const [fieldEdits, setFieldEdits] = useState<Partial<Record<FieldKey, string>>>({});
  const [lineEdits, setLineEdits] = useState<Record<string, string>>({});
  const [confirms, setConfirms] = useState<FieldKey[]>([]);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [focusLine, setFocusLine] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState("");
  const [draft, setDraft] = useState<{ subject: string; body: string; to: string | null; excludedBankFinding: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  // Handling time for the ROI measurement (wall time since first opened, capped server-side).
  const timerKey = `fp-review-start-${doc.id}`;
  useEffect(() => {
    try {
      if (!comfortStorage("session").getItem(timerKey)) comfortStorage("session").setItem(timerKey, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, [timerKey]);
  const reviewSeconds = () => {
    try {
      const start = Number(comfortStorage("session").getItem(timerKey) ?? Date.now());
      return Math.max(1, Math.min(1800, Math.round((Date.now() - start) / 1000)));
    } catch {
      return undefined;
    }
  };
  const clearTimer = () => {
    try {
      comfortStorage("session").removeItem(timerKey);
    } catch {
      /* ignore */
    }
  };

  const changeCount = Object.keys(fieldEdits).length + Object.keys(lineEdits).length + confirms.length;

  async function saveChanges() {
    if (!x) return;
    const fields: Partial<Record<FieldKey, string | null>> = {};
    for (const [key, raw] of Object.entries(fieldEdits) as [FieldKey, string][]) {
      const kind = FIELD_KIND[key];
      if (raw.trim() === "") fields[key] = null;
      else if (kind === "money" || kind === "percent") {
        const n = parseGermanNumber(raw);
        fields[key] = n == null ? raw : String(n);
      } else if (kind === "iban") fields[key] = raw.replace(/\s+/g, "").toUpperCase();
      else fields[key] = raw;
    }
    const lineItems = Object.entries(lineEdits).map(([k, raw]) => {
      const [index, field] = k.split(":");
      const numeric = field === "quantity" || field === "unitPrice" || field === "total";
      const n = numeric ? parseGermanNumber(raw) : null;
      return { index: Number(index), field, value: raw.trim() === "" ? null : numeric ? (n == null ? raw : String(n)) : raw };
    });
    try {
      await run(`/api/documents/${doc.id}`, { method: "PATCH", body: { fields, lineItems, confirm: confirms } }, { success: t.savedRecheck });
      setFieldEdits({});
      setLineEdits({});
      setConfirms([]);
    } catch {
      /* toast shown */
    }
  }

  async function decideIssue(issue: ValidationIssue, action: "accept" | "resolve" | "reopen", issueNote?: string) {
    try {
      await run(`/api/documents/${doc.id}/issues/${issue.id}`, { body: { action, note: issueNote } });
      setDialog(null);
      setNote("");
    } catch {
      /* toast shown */
    }
  }

  async function decide(decision: "approve" | "reject" | "request_info" | "handover") {
    try {
      const res = await run<{ status: string; exportRef: string | null; draft?: typeof draft }>(
        `/api/documents/${doc.id}/decision`,
        { body: { decision, note: note || undefined, assigneeId: decision === "handover" ? assignee : undefined, reviewSeconds: reviewSeconds() } },
      );
      if (decision === "request_info" && res.draft) {
        setDraft(res.draft);
        return;
      }
      setDialog(null);
      setNote("");
      if (decision === "approve") {
        clearTimer();
        push({ tone: "success", title: res.exportRef ? fmt(t.approvedErp, { ref: res.exportRef }) : t.approved });
      } else if (decision === "reject") {
        clearTimer();
        push({ tone: "success", title: t.rejected });
      } else if (decision === "handover") push({ tone: "success", title: t.handedOver });
    } catch {
      /* toast shown */
    }
  }

  const ruleName = (id: string) => detail.ruleNames[id]?.[lang] ?? id;
  const reasons = (doc.routing?.reasons ?? []).filter((r) => r.code !== "RULE_CONTINUE" || doc.route === "auto");
  const timeline = useMemo(() => [...detail.emailEvents, ...detail.timeline].sort((a, b) => a.id - b.id), [detail.emailEvents, detail.timeline]);
  const title = `${d.docType[docType]} ${doc.documentNumber ?? ""}`.trim();
  const approval = detail.approval;
  const assigneeUser = detail.users.find((u) => u.id === doc.assigneeId);

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1 text-[13px] text-slate-500" aria-label="Breadcrumb">
        <Link href="/app/review" className="hover:text-slate-800">
          {t.breadcrumb}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate text-slate-700">{title}</span>
      </nav>

      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-[22px]">
            {title}
            {doc.partyName && <span className="font-normal text-slate-500"> · {doc.partyName}</span>}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <DocTypeBadge type={docType} />
            <StatusBadge status={doc.status} />
            {!EDITABLE.includes(doc.status) && <RouteBadge route={doc.route} />}
            <PriorityBadge priority={doc.priority} />
            {doc.routing && <ConfidenceBadge value={doc.routing.confidence} />}
            {doc.netAmount != null && <Badge tone="outline">{f.money(doc.grossAmount ?? doc.netAmount)}</Badge>}
            {doc.dueAt && EDITABLE.includes(doc.status) && (
              <Badge tone={new Date(doc.dueAt) < new Date() ? "danger" : "neutral"}>
                {t.due}: {f.relative(doc.dueAt)}
              </Badge>
            )}
            {assigneeUser && (
              <Badge tone="neutral" icon={<UserCheck className="size-3" />}>
                {assigneeUser.name}
              </Badge>
            )}
          </div>
        </div>
        {EDITABLE.includes(doc.status) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button size="sm" icon={<MessageSquareText className="size-4" />} onClick={() => setDialog("info")} disabled={!permissions.edit || pending}>
              {t.actions.requestInfo}
            </Button>
            <Button size="sm" icon={<Forward className="size-4" />} onClick={() => setDialog("handover")} disabled={!permissions.handover || pending}>
              {t.actions.handover}
            </Button>
            <Button size="sm" variant="danger" icon={<ThumbsDown className="size-4" />} onClick={() => setDialog("reject")} disabled={!permissions.reject || pending}>
              {t.actions.reject}
            </Button>
            <Tooltip content={!approval.allowed ? approval.reasons.map((r) => fmt(t.approveReasons[r.code] ?? r.code, { ...r.params, role: r.params?.role ? d.role[r.params.role as keyof typeof d.role] : "" })).join(" ") : null}>
              <span>
                <Button size="sm" variant="success" icon={<Check className="size-4" />} onClick={() => setDialog("approve")} disabled={!approval.allowed || pending || changeCount > 0}>
                  {t.actions.approve}
                </Button>
              </span>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Decision explanation */}
      <Card className="mb-4" as="div">
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:px-5">
          <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", doc.route === "auto" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700")}>
            {doc.route === "auto" ? <Bot className="size-4" /> : <ShieldCheck className="size-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{doc.route === "auto" ? t.whyAuto : t.why}</p>
            <ul className="mt-1 space-y-0.5 text-[13px] text-slate-600">
              {reasons.map((r, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-slate-500">•</span>
                  {reasonText(r, d, f, ruleName)}
                </li>
              ))}
            </ul>
            {detail.workflow && (
              <p className="mt-1.5 text-xs text-slate-500">
                {t.workflow}: <Link href="/app/workflows" className="font-medium text-slate-700 hover:underline">{detail.workflow.name[lang]}</Link> (v{detail.workflow.version})
              </p>
            )}
            {doc.decidedBy && doc.decidedAt && <p className="mt-1.5 text-xs font-medium text-slate-600">{fmt(t.decisionBy, { name: doc.decidedBy, date: f.dateTime(doc.decidedAt) })}</p>}
          </div>
          {!EDITABLE.includes(doc.status) && nextId && (
            <ButtonLink href={`/app/documents/${nextId}`} size="sm" variant="primary" className="self-start">
              {t.nextInQueue} <ArrowRight className="size-4" />
            </ButtonLink>
          )}
        </div>
        {!approval.allowed && EDITABLE.includes(doc.status) && approval.reasons.some((r) => r.code.startsWith("four_eyes")) && (
          <div className="border-t border-slate-100 px-4 py-2.5 sm:px-5">
            <Callout tone="warning" title={t.cannotApprove}>
              {approval.reasons.map((r) => fmt(t.approveReasons[r.code] ?? r.code, r.params ?? {})).join(" ")} {t.switchUserHint}
            </Callout>
          </div>
        )}
      </Card>

      {detail.erp && (
        <Card className="mb-4" as="div">
          <CardHeader
            title={`${t.erpTitle}: ${detail.erp.externalRef}`}
            description={`${STAGE_LABEL[docType]?.[lang] ?? detail.erp.kind} · ${f.dateTime(detail.erp.createdAt)} · ${detail.erp.createdBy}`}
            icon={<Check className="size-4 text-emerald-600" />}
          />
          <details className="px-4 py-3 sm:px-5">
            <summary className="cursor-pointer text-[13px] font-medium text-slate-600">{t.erpPayload}</summary>
            <pre tabIndex={0} aria-label={t.erpPayload} className="mt-2 max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-100">{JSON.stringify(detail.erp.payload, null, 2)}</pre>
          </details>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="xl:sticky xl:top-20 xl:self-start">
          <DocumentViewer detail={detail} highlight={highlight} />
        </div>
        <div className="min-w-0">
          <Tabs defaultValue="review">
            <TabsList className="mb-4">
              <TabsTrigger value="review">{t.tabs.review}</TabsTrigger>
              <TabsTrigger value="compare">{t.tabs.compare}</TabsTrigger>
              <TabsTrigger value="history" count={timeline.length}>
                {t.tabs.history}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="review" className="space-y-4">
              {!EDITABLE.includes(doc.status) && <Callout tone="neutral">{t.readOnly}</Callout>}
              <IssuesPanel
                issues={issues}
                docType={docType}
                editable={editable}
                canAcceptCritical={permissions.acceptCritical}
                busy={pending}
                onAccept={(issue) => {
                  setNote("");
                  setDialog({ accept: issue });
                }}
                onResolve={(issue) => decideIssue(issue, "resolve")}
                onReopen={(issue) => decideIssue(issue, "reopen")}
                onFocusLine={(issue) => {
                  if (issue.lineIndex != null) {
                    setFocusLine(issue.lineIndex);
                    setHighlight(x?.lineItems[issue.lineIndex]?.source ?? null);
                    document.getElementById("line-items")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  } else if (issue.field) setHighlight(x?.fields[issue.field]?.source ?? null);
                }}
              />
              {changeCount > 0 && (
                <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-900 shadow-sm ring-1 ring-blue-200">
                  <span>{fmt(t.unsaved, { n: changeCount })}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFieldEdits({});
                        setLineEdits({});
                        setConfirms([]);
                      }}
                    >
                      {t.discard}
                    </Button>
                    <Button size="sm" variant="accent" loading={pending} onClick={saveChanges}>
                      {t.saveChanges}
                    </Button>
                  </div>
                </div>
              )}
              {x && x.docType !== "other" && (
                <FieldsPanel
                  extraction={x}
                  editable={editable}
                  edits={fieldEdits}
                  confirms={confirms}
                  onEdit={(key, value) => setFieldEdits((e) => ({ ...e, [key]: value }))}
                  onConfirm={(key) => setConfirms((c) => (c.includes(key) ? c : [...c, key]))}
                  onShowSource={(s) => setHighlight(s)}
                  activeSource={highlight}
                  issues={issues}
                />
              )}
              <div id="line-items">
                {x && (
                  <LineItemsPanel
                    extraction={x}
                    comparison={detail.comparison}
                    editable={editable}
                    edits={lineEdits}
                    onEdit={(i, field, value) => setLineEdits((e) => ({ ...e, [`${i}:${field}`]: value }))}
                    issues={issues}
                    focusLine={focusLine}
                    onShowSource={(s) => setHighlight(s)}
                  />
                )}
              </div>
              {editable && <p className="text-xs text-slate-500">{t.timer}</p>}
            </TabsContent>
            <TabsContent value="compare">
              <ComparePanel detail={detail} />
            </TabsContent>
            <TabsContent value="history">
              <Card className="px-4 py-4 sm:px-5" as="div">
                {timeline.length === 0 ? <p className="text-sm text-slate-500">{t.history.empty}</p> : <AuditTimeline events={timeline} />}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Approve */}
      <Dialog
        open={dialog === "approve"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t.approveTitle}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>{lang === "de" ? "Abbrechen" : "Cancel"}</Button>
            <Button variant="success" loading={pending} onClick={() => decide("approve")} icon={<Check className="size-4" />}>
              {t.actions.approve}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
            <p className="font-medium text-slate-800">{t.approveWhat}</p>
            <p className="mt-1 text-slate-600">
              {detail.workflow?.params.targetSystem === "demo_erp" && STAGE_LABEL[docType]
                ? fmt(t.approveTransfer, { target: "Demo-ERP-Sandbox", kind: STAGE_LABEL[docType][lang] })
                : t.approveNoTransfer}
            </p>
          </div>
          <div>
            <Label htmlFor="approve-note">{t.approveNote}</Label>
            <Textarea id="approve-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      </Dialog>

      {/* Reject */}
      <Dialog
        open={dialog === "reject"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t.rejectTitle}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>{lang === "de" ? "Abbrechen" : "Cancel"}</Button>
            <Button variant="danger" loading={pending} disabled={note.trim().length < 5} onClick={() => decide("reject")}>
              {t.actions.reject}
            </Button>
          </>
        }
      >
        <Label htmlFor="reject-note">{t.rejectNote}</Label>
        <Textarea id="reject-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.rejectPlaceholder} />
      </Dialog>

      {/* Accept issue */}
      <Dialog
        open={typeof dialog === "object" && dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t.acceptTitle}
        description={t.acceptText}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>{lang === "de" ? "Abbrechen" : "Cancel"}</Button>
            <Button
              variant="primary"
              loading={pending}
              disabled={note.trim().length < 5}
              onClick={() => typeof dialog === "object" && dialog && decideIssue(dialog.accept, "accept", note)}
            >
              {t.accept}
            </Button>
          </>
        }
      >
        <Label htmlFor="accept-note">{t.acceptNote}</Label>
        <Textarea id="accept-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.acceptPlaceholder} />
      </Dialog>

      {/* Request info */}
      <Dialog
        open={dialog === "info"}
        onOpenChange={(o) => {
          if (!o) {
            setDialog(null);
            setDraft(null);
            setNote("");
          }
        }}
        title={t.infoTitle}
        description={t.infoText}
        size="lg"
        footer={
          draft ? (
            <>
              <Button
                icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    /* clipboard unavailable */
                  }
                }}
              >
                {copied ? t.copied : t.copy}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setDialog(null);
                  setDraft(null);
                  router.refresh();
                }}
              >
                {lang === "de" ? "Fertig" : "Done"}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setDialog(null)}>{lang === "de" ? "Abbrechen" : "Cancel"}</Button>
              <Button variant="primary" loading={pending} onClick={() => decide("request_info")}>
                {t.infoCreate}
              </Button>
            </>
          )
        }
      >
        {draft ? (
          <div className="space-y-3 text-sm">
            {draft.excludedBankFinding && <Callout tone="warning">{t.bankWarning}</Callout>}
            <dl className="grid grid-cols-[80px_1fr] gap-y-1">
              <dt className="text-slate-500">{t.infoTo}</dt>
              <dd className="font-medium">{draft.to ?? "—"}</dd>
              <dt className="text-slate-500">{t.infoSubject}</dt>
              <dd className="font-medium">{draft.subject}</dd>
            </dl>
            <pre className="rounded-lg bg-slate-50 p-3 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-slate-800 ring-1 ring-slate-200">{draft.body}</pre>
            <p className="text-xs text-slate-500">{t.infoText}</p>
          </div>
        ) : (
          <div>
            {issues.some((i) => i.code === "IBAN_CHANGED" && i.status === "open") && <Callout tone="warning" className="mb-3">{t.bankWarning}</Callout>}
            <Label htmlFor="info-note">{t.infoNote}</Label>
            <Textarea id="info-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}
      </Dialog>

      {/* Handover */}
      <Dialog
        open={dialog === "handover"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t.handoverTitle}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>{lang === "de" ? "Abbrechen" : "Cancel"}</Button>
            <Button variant="primary" loading={pending} disabled={!assignee} onClick={() => decide("handover")}>
              {t.actions.handover}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="handover-to">{t.handoverTo}</Label>
            <Select id="handover-to" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">—</option>
              {detail.users
                .filter((u) => u.role !== "viewer" && u.id !== currentUserId)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} – {u.title[lang]}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="handover-note">{t.handoverNote}</Label>
            <Textarea id="handover-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

type DetailProp = DocumentDetail;
