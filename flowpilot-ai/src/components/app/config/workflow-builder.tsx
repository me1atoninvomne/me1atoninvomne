"use client";

import {
  ArrowDown,
  Bell,
  Bot,
  Check,
  Database,
  FileSearch,
  FlaskConical,
  ListChecks,
  Lock,
  Mail,
  Play,
  ScanText,
  Send,
  ShieldCheck,
  Split,
  UserCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DEPARTMENTS, FINANCIAL_DOC_TYPES, type Department, type DocType, type WorkflowParams, type WorkflowStepType } from "@/domain/types";
import { fmt } from "@/i18n/core";
import { useDomain, useFormat, useLang, useT } from "@/i18n/client";
import { reasonText } from "@/i18n/domain";
import { workflowsDict } from "@/i18n/ui/config";
import { useMutation } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { Badge } from "../../ui/badge";
import { Button, ButtonLink } from "../../ui/button";
import { Card, CardHeader } from "../../ui/card";
import { Callout } from "../../ui/feedback";
import { Input, Label, Select, Switch } from "../../ui/form";
import { RouteBadge } from "../badges";
import { conditionPhrase } from "./rule-sentence";
import type { RuleRow, SampleDoc, SimulationResult, WorkflowItem } from "./types";

const STEP_ICON: Record<WorkflowStepType, React.ComponentType<{ className?: string }>> = {
  trigger: Mail,
  classify: ScanText,
  extract: FileSearch,
  match: Database,
  validate: ShieldCheck,
  rules: ListChecks,
  gate: Split,
  auto: Bot,
  review: UserCheck,
  transfer: Send,
  notify: Bell,
};

export function WorkflowsTab({
  workflows,
  rules,
  sampleDocs,
  canEdit,
  initialWorkflowId,
}: {
  workflows: WorkflowItem[];
  rules: RuleRow[];
  sampleDocs: SampleDoc[];
  canEdit: boolean;
  initialWorkflowId: string | null;
}) {
  const t = useT(workflowsDict);
  const d = useDomain();
  const lang = useLang();
  const { run, pending } = useMutation();
  const [selectedId, setSelectedId] = useState(initialWorkflowId && workflows.some((w) => w.id === initialWorkflowId) ? initialWorkflowId : workflows[0]?.id);
  const selected = workflows.find((w) => w.id === selectedId) ?? workflows[0];

  const toggleActive = (wf: WorkflowItem, active: boolean) =>
    run(`/api/workflows/${wf.id}`, { method: "PATCH", body: { active } }, { success: active ? t.params.activated : t.params.deactivated }).catch(() => {});

  if (!selected) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Mobile: select */}
      <div className="lg:hidden">
        <Label htmlFor="wf-select">{t.list}</Label>
        <Select id="wf-select" value={selected.id} onChange={(e) => setSelectedId(e.target.value)}>
          {workflows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name[lang]} {w.active ? "" : `(${t.inactive})`}
            </option>
          ))}
        </Select>
      </div>
      {/* Desktop: list */}
      <Card className="hidden self-start overflow-hidden lg:block" as="div">
        <CardHeader title={t.list} />
        <ul className="divide-y divide-slate-100">
          {workflows.map((w) => {
            const active = w.id === selected.id;
            return (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(w.id)}
                  aria-current={active || undefined}
                  className={cn("relative block w-full px-4 py-3 text-left transition-colors", active ? "bg-navy-50/70" : "hover:bg-slate-50")}
                >
                  {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-navy-700" />}
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-[13px] leading-snug font-medium text-slate-900">{w.name[lang]}</span>
                    <span className={cn("mt-1 size-2 shrink-0 rounded-full", w.active ? "bg-emerald-500" : "bg-slate-300")} aria-label={w.active ? t.active : t.inactive} />
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">{(w.docTypes as DocType[]).map((x) => d.docTypePlural[x]).join(", ")}</span>
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    <Badge tone={w.params.autoProcess ? "success" : "neutral"}>{w.params.autoProcess ? t.chips.autoOn : t.chips.autoOff}</Badge>
                    <Badge tone="outline">v{w.version}</Badge>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <WorkflowEditor
        key={`${selected.id}-${selected.version}`}
        workflow={selected}
        rules={rules}
        sampleDocs={sampleDocs.filter((s) => (selected.docTypes as DocType[]).includes(s.docType))}
        canEdit={canEdit}
        onToggleActive={(v) => toggleActive(selected, v)}
        toggling={pending}
      />
    </div>
  );
}

function WorkflowEditor({
  workflow,
  rules,
  sampleDocs,
  canEdit,
  onToggleActive,
  toggling,
}: {
  workflow: WorkflowItem;
  rules: RuleRow[];
  sampleDocs: SampleDoc[];
  canEdit: boolean;
  onToggleActive: (v: boolean) => void;
  toggling: boolean;
}) {
  const t = useT(workflowsDict);
  const d = useDomain();
  const f = useFormat();
  const lang = useLang();
  const { run, pending } = useMutation();
  const [draft, setDraft] = useState<WorkflowParams>(workflow.params);
  const [docId, setDocId] = useState(sampleDocs[0]?.id ?? "");
  const [sim, setSim] = useState<SimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const locked = (workflow.docTypes as DocType[]).some((x) => FINANCIAL_DOC_TYPES.includes(x));
  const dirty = JSON.stringify(draft) !== JSON.stringify(workflow.params);
  const set = <K extends keyof WorkflowParams>(k: K, v: WorkflowParams[K]) => setDraft((p) => ({ ...p, [k]: v }));

  const applicableRules = rules.filter((r) => r.enabled && (r.docTypes === "all" || (r.docTypes as DocType[]).some((x) => (workflow.docTypes as DocType[]).includes(x))));
  const ruleName = (id: string) => rules.find((r) => r.id === id)?.name[lang] ?? id;

  async function save() {
    try {
      await run(`/api/workflows/${workflow.id}`, { method: "PATCH", body: { params: draft } }, { success: fmt(t.params.saved, { v: workflow.version + 1 }) });
    } catch {
      /* toast shown */
    }
  }

  async function simulate() {
    if (!docId) return;
    setSimulating(true);
    try {
      const res = await run<SimulationResult>(`/api/workflows/${workflow.id}/simulate`, { body: { documentId: docId, overrides: dirty ? draft : undefined } }, { refresh: false });
      setSim(res);
    } catch {
      /* toast shown */
    } finally {
      setSimulating(false);
    }
  }

  const money = (v: number | null) => (v == null ? t.params.noLimit : f.money(v, { decimals: 0 }));
  const chips: Record<WorkflowStepType, string[]> = {
    trigger: [t.chips.mailbox, t.chips.upload],
    classify: (workflow.docTypes as DocType[]).map((x) => d.docType[x]),
    extract: [t.chips.provider],
    match: [t.chips.masterData],
    validate: [t.chips.checks],
    rules: [fmt(t.chips.activeRules, { n: applicableRules.length })],
    gate: [
      fmt(t.chips.minConfidence, { v: f.percent(draft.minConfidence) }),
      draft.maxAutoAmount != null ? fmt(t.chips.autoLimit, { v: money(draft.maxAutoAmount) }) : t.chips.noAutoLimit,
      ...(draft.approvalLimit != null ? [fmt(t.chips.approvalLimit, { v: money(draft.approvalLimit) })] : []),
    ],
    auto: [draft.autoProcess && !locked ? t.chips.autoOn : t.chips.autoOff],
    review: [d.department[draft.reviewDepartment], fmt(t.chips.sla, { v: draft.slaHours })],
    transfer: [draft.targetSystem === "demo_erp" ? t.chips.target : t.chips.noTarget],
    notify: [t.chips.inApp, d.department[draft.reviewDepartment], ...(draft.notifyDepartment ? [d.department[draft.notifyDepartment]] : [])],
  };
  const steps = useMemo(() => {
    const ids = ["trigger", "classify", "extract", "match", "validate", "rules", "gate", "auto", "review", ...(draft.targetSystem !== "none" ? ["transfer"] : []), "notify"];
    return ids as WorkflowStepType[];
  }, [draft.targetSystem]);
  const path = sim?.path ?? null;
  const state = (id: string): NodeState => (!path ? "default" : path.includes(id) ? "active" : "dim");
  const linear = steps.filter((s) => s !== "auto" && s !== "review" && s !== "transfer" && s !== "notify");
  const tail = steps.filter((s) => s === "transfer" || s === "notify");
  const updated = workflow.updatedBy ? `${fmt(t.updated, { date: f.dateTime(workflow.updatedAt) })} ${fmt(t.updatedBy, { name: workflow.updatedBy })}` : t.neverChanged;

  return (
    <div className="min-w-0 space-y-4">
      <Card as="div">
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{workflow.name[lang]}</h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-600">{workflow.description[lang]}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <Badge tone="outline">{fmt(t.version, { v: workflow.version })}</Badge>
              <span>{updated}</span>
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-700">
            <Switch checked={workflow.active} onCheckedChange={onToggleActive} disabled={!canEdit || toggling} label={workflow.active ? t.active : t.inactive} />
            {workflow.active ? t.active : t.inactive}
          </label>
        </div>
        {!workflow.active && (
          <div className="border-t border-slate-100 px-4 py-2.5 sm:px-5">
            <Callout tone="warning">{t.params.inactiveHint}</Callout>
          </div>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card as="div">
          <CardHeader
            title={t.diagram}
            actions={
              path && (
                <Button size="xs" variant="ghost" icon={<X className="size-3.5" />} onClick={() => setSim(null)}>
                  {t.test.clear}
                </Button>
              )
            }
          />
          <div className="px-3 py-4 sm:px-5">
            {linear.map((s, i) => (
              <div key={s}>
                {i > 0 && <Connector active={!!path && path.includes(linear[i - 1]) && path.includes(s)} />}
                <FlowNode type={s} chips={chips[s]} state={state(s)} index={i + 1} />
              </div>
            ))}
            <BranchConnector active={path ? (path.includes("auto") ? "left" : path.includes("review") ? "right" : null) : null} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-center text-[11px] font-semibold tracking-wide text-emerald-700 uppercase">{t.branchAuto}</p>
                <FlowNode type="auto" chips={chips.auto} state={state("auto")} tone="auto" muted={!draft.autoProcess || locked} />
              </div>
              <div className="sm:mt-0">
                <p className="mb-1.5 text-center text-[11px] font-semibold tracking-wide text-amber-700 uppercase">{t.branchReview}</p>
                <FlowNode type="review" chips={chips.review} state={state("review")} tone="review" />
              </div>
            </div>
            <BranchConnector merge active={path ? (path.includes("auto") ? "left" : path.includes("review") ? "right" : null) : null} />
            {tail.map((s, i) => (
              <div key={s}>
                {i > 0 && <Connector active={!!path && path.includes(tail[i - 1]) && path.includes(s)} />}
                <FlowNode type={s} chips={chips[s]} state={state(s)} />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card as="div">
            <CardHeader title={t.params.title} description={t.params.subtitle} />
            <div className="space-y-4 px-4 py-4 sm:px-5">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <label htmlFor={`auto-${workflow.id}`} className="text-[13px] font-medium text-slate-700">
                    {t.params.autoProcess}
                  </label>
                  <Switch
                    id={`auto-${workflow.id}`}
                    checked={draft.autoProcess && !locked}
                    onCheckedChange={(v) => set("autoProcess", v)}
                    disabled={!canEdit || locked}
                    label={t.params.autoProcess}
                  />
                </div>
                {locked ? (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-600">
                    <Lock className="size-3.5" /> {t.params.autoLocked}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">{t.params.autoProcessHint}</p>
                )}
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor={`conf-${workflow.id}`} className="text-[13px] font-medium text-slate-700">
                    {t.params.minConfidence}
                  </label>
                  <span className="tabular text-sm font-semibold text-slate-900">{f.percent(draft.minConfidence)}</span>
                </div>
                <input
                  id={`conf-${workflow.id}`}
                  type="range"
                  min={50}
                  max={100}
                  step={1}
                  value={Math.round(draft.minConfidence * 100)}
                  onChange={(e) => set("minConfidence", Number(e.target.value) / 100)}
                  disabled={!canEdit}
                  className="mt-1.5 w-full accent-navy-800"
                />
                <p className="text-xs text-slate-500">{t.params.minConfidenceHint}</p>
              </div>
              <AmountField
                id={`max-${workflow.id}`}
                label={t.params.maxAutoAmount}
                value={draft.maxAutoAmount}
                onChange={(v) => set("maxAutoAmount", v)}
                disabled={!canEdit || locked || !draft.autoProcess}
                placeholder={t.params.noLimit}
              />
              <AmountField id={`appr-${workflow.id}`} label={t.params.approvalLimit} value={draft.approvalLimit} onChange={(v) => set("approvalLimit", v)} disabled={!canEdit} placeholder={t.params.noLimit} />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div>
                  <Label htmlFor={`dep-${workflow.id}`}>{t.params.reviewDepartment}</Label>
                  <Select id={`dep-${workflow.id}`} value={draft.reviewDepartment} onChange={(e) => set("reviewDepartment", e.target.value as Department)} disabled={!canEdit}>
                    {DEPARTMENTS.map((dep) => (
                      <option key={dep} value={dep}>
                        {d.department[dep]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`notify-${workflow.id}`}>{t.params.notifyDepartment}</Label>
                  <Select
                    id={`notify-${workflow.id}`}
                    value={draft.notifyDepartment ?? ""}
                    onChange={(e) => set("notifyDepartment", (e.target.value || null) as Department | null)}
                    disabled={!canEdit}
                  >
                    <option value="">{t.params.none}</option>
                    {DEPARTMENTS.map((dep) => (
                      <option key={dep} value={dep}>
                        {d.department[dep]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`sla-${workflow.id}`}>{t.params.slaHours}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`sla-${workflow.id}`}
                      type="number"
                      min={1}
                      max={720}
                      value={draft.slaHours}
                      onChange={(e) => set("slaHours", Math.max(1, Math.min(720, Math.round(Number(e.target.value) || 1))))}
                      disabled={!canEdit}
                      className="tabular"
                    />
                    <span className="text-xs text-slate-500">{t.params.hours}</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor={`target-${workflow.id}`}>{t.params.targetSystem}</Label>
                  <Select id={`target-${workflow.id}`} value={draft.targetSystem} onChange={(e) => set("targetSystem", e.target.value as WorkflowParams["targetSystem"])} disabled={!canEdit}>
                    <option value="demo_erp">{t.params.targetDemo}</option>
                    <option value="none">{t.params.targetNone}</option>
                  </Select>
                </div>
              </div>
            </div>
            {canEdit && (
              <div className={cn("flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-5", dirty && "bg-blue-50/60")}>
                {dirty && <span className="mr-auto text-xs font-medium text-blue-800">{t.params.unsaved}</span>}
                <Button size="sm" variant="ghost" onClick={() => setDraft(workflow.params)} disabled={!dirty || pending}>
                  {t.params.discard}
                </Button>
                <Button size="sm" variant="primary" onClick={save} disabled={!dirty} loading={pending && !simulating}>
                  {t.params.save}
                </Button>
              </div>
            )}
          </Card>

          <Card as="div">
            <CardHeader title={t.test.title} description={t.test.subtitle} icon={<FlaskConical className="size-4" />} />
            <div className="space-y-3 px-4 py-4 sm:px-5">
              {sampleDocs.length === 0 ? (
                <div className="space-y-3 text-sm text-slate-600">
                  <p>{t.test.noDocs}</p>
                  <ButtonLink href="/app/inbox" size="sm">
                    {t.test.toInbox}
                  </ButtonLink>
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor={`doc-${workflow.id}`}>{t.test.pick}</Label>
                    <Select id={`doc-${workflow.id}`} value={docId} onChange={(e) => setDocId(e.target.value)}>
                      {sampleDocs.map((s) => (
                        <option key={s.id} value={s.id}>
                          {d.docType[s.docType]}: {s.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button size="sm" variant="accent" icon={<Play className="size-4" />} onClick={simulate} loading={simulating} className="w-full">
                    {t.test.run}
                  </Button>
                  <p className="text-xs text-slate-500">
                    {t.test.note}
                    {dirty && <span className="block font-medium text-blue-800">{t.test.unsavedNote}</span>}
                  </p>
                </>
              )}
              {sim && (
                <div className="fade-in space-y-3 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{t.test.result}</span>
                    <RouteBadge route={sim.route} />
                    {sim.requiredRole && sim.route !== "auto" && (
                      <Badge tone="outline">
                        {t.test.requiredRole}: {d.role[sim.requiredRole as keyof typeof d.role]}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-700">{t.test.reasons}</p>
                    <ul className="mt-1 space-y-0.5 text-[13px] text-slate-600">
                      {sim.reasons
                        .filter((r) => r.code !== "RULE_CONTINUE" || sim.route === "auto")
                        .map((r, i) => (
                          <li key={i} className="flex gap-1.5">
                            <span className="text-slate-400">•</span>
                            {reasonText(r as Parameters<typeof reasonText>[0], d, f, ruleName)}
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-700">{t.test.rules}</p>
                    {sim.ruleEvaluations.length === 0 ? (
                      <p className="mt-1 text-[13px] text-slate-500">{t.test.noRules}</p>
                    ) : (
                      <ul className="mt-1.5 space-y-2">
                        {sim.ruleEvaluations.map((ev) => (
                          <li key={ev.id} className="rounded-md bg-slate-50 px-2.5 py-2 ring-1 ring-slate-200">
                            <p className="flex items-start justify-between gap-2 text-[13px]">
                              <span className="font-medium text-slate-800">{ruleName(ev.id)}</span>
                              <Badge tone={ev.matched ? "success" : "neutral"}>{ev.matched ? t.test.matched : t.test.notMatched}</Badge>
                            </p>
                            <ul className="mt-1 space-y-0.5">
                              {ev.conditions.map((c, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                                  {c.result ? <Check className="mt-0.5 size-3 shrink-0 text-emerald-600" /> : <X className="mt-0.5 size-3 shrink-0 text-slate-400" />}
                                  {conditionPhrase(c.condition, t, f)}
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Callout tone="neutral" title={t.guardrails.title} icon={<ShieldCheck className="size-4 text-navy-700" />}>
        <p>{t.guardrails.text}</p>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
          {t.guardrails.items.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </Callout>
    </div>
  );
}

type NodeState = "default" | "active" | "dim";

function FlowNode({
  type,
  chips,
  state,
  index,
  tone,
  muted,
}: {
  type: WorkflowStepType;
  chips: string[];
  state: NodeState;
  index?: number;
  tone?: "auto" | "review";
  muted?: boolean;
}) {
  const d = useDomain();
  const Icon = STEP_ICON[type];
  const iconTone =
    tone === "auto" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : tone === "review" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-navy-50 text-navy-700 ring-navy-100";
  return (
    <div
      className={cn(
        "relative flex gap-2.5 rounded-lg bg-white px-3 py-2.5 ring-1 transition-all",
        state === "active" ? "ring-2 ring-navy-600 shadow-sm" : "ring-slate-200",
        state === "dim" && "opacity-45",
        muted && state === "default" && "bg-slate-50",
      )}
    >
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full ring-1", iconTone)}>
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
          {index != null && <span className="tabular text-[11px] font-medium text-slate-400">{index}</span>}
          {d.step[type].title}
          {state === "active" && <Check className="size-3.5 text-navy-700" aria-hidden />}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-slate-500">{d.step[type].text}</p>
        {chips.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {chips.map((c) => (
              <span key={c} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Connector({ active }: { active?: boolean }) {
  return (
    <div className="flex justify-center py-0.5" aria-hidden>
      <div className="flex flex-col items-center">
        <div className={cn("h-3 w-px", active ? "bg-navy-600" : "bg-slate-300")} />
        <ArrowDown className={cn("-mt-1 size-3", active ? "text-navy-600" : "text-slate-300")} />
      </div>
    </div>
  );
}

/** Split (gate → two branches) or merge (two branches → transfer) connector. */
function BranchConnector({ merge, active }: { merge?: boolean; active: "left" | "right" | null }) {
  const line = (on: boolean) => (on ? "bg-navy-600" : "bg-slate-300");
  return (
    <>
      <div className="sm:hidden">
        <Connector active={active != null} />
      </div>
      <div className="relative hidden h-6 sm:block" aria-hidden>
        <div className={cn("absolute left-1/2 h-3 w-px", merge ? "bottom-0" : "top-0", line(active != null))} />
        <div className={cn("absolute top-1/2 left-1/4 h-px w-1/4", line(active === "left"))} />
        <div className={cn("absolute top-1/2 left-1/2 h-px w-1/4", line(active === "right"))} />
        <div className={cn("absolute left-1/4 h-3 w-px", merge ? "top-0" : "bottom-0", line(active === "left"))} />
        <div className={cn("absolute left-3/4 h-3 w-px", merge ? "top-0" : "bottom-0", line(active === "right"))} />
      </div>
    </>
  );
}

function AmountField({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          min={0}
          step={500}
          inputMode="numeric"
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
          disabled={disabled}
          className="tabular"
        />
        <span className="text-xs text-slate-500">€</span>
      </div>
    </div>
  );
}
