"use client";

import { Info, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  BUSINESS_DOC_TYPES,
  CONDITION_FIELDS,
  DEPARTMENTS,
  ROLES,
  type ConditionField,
  type ConditionOp,
  type DocType,
  type Rule,
  type RuleAction,
  type RuleActionType,
  type RuleCondition,
} from "@/domain/types";
import { fmt } from "@/i18n/core";
import { useDomain, useFormat, useLang, useT } from "@/i18n/client";
import { commonDict } from "@/i18n/ui/common";
import { workflowsDict } from "@/i18n/ui/config";
import { useMutation } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardHeader } from "../../ui/card";
import { Callout, EmptyState } from "../../ui/feedback";
import { Input, Label, Select, Switch } from "../../ui/form";
import { Dialog } from "../../ui/overlay";
import { docTypesLabel, isBooleanField, ruleSentence } from "./rule-sentence";
import { toRule, type RuleRow } from "./types";

const ACTION_TYPES: RuleActionType[] = ["continue", "require_approval", "route_review", "notify", "set_priority"];
const NUMERIC_OPS: ConditionOp[] = ["gt", "gte", "lt", "lte"];

interface Draft {
  id: string | null;
  nameDe: string;
  nameEn: string;
  enabled: boolean;
  docTypes: Rule["docTypes"];
  conditions: { field: ConditionField; op: ConditionOp; value: string }[];
  action: RuleAction;
}

const emptyDraft = (): Draft => ({
  id: null,
  nameDe: "",
  nameEn: "",
  enabled: true,
  docTypes: ["purchase_order"],
  conditions: [{ field: "netAmount", op: "gt", value: "10000" }],
  action: { type: "require_approval", role: "manager" },
});

function toDraft(r: RuleRow): Draft {
  return {
    id: r.id,
    nameDe: r.name.de,
    nameEn: r.name.en === r.name.de ? "" : r.name.en,
    enabled: r.enabled,
    docTypes: r.docTypes,
    conditions: r.conditions.map((c) => ({ field: c.field, op: c.op, value: c.value == null ? "" : String(c.value) })),
    action: { ...r.action },
  };
}

function draftConditions(d: Draft): RuleCondition[] {
  return d.conditions.map((c) => (isBooleanField(c.field) ? { field: c.field, op: c.op } : { field: c.field, op: c.op, value: c.value === "" ? null : Number(c.value.replace(",", ".")) }));
}

export function RulesTab({ rules, canEdit }: { rules: RuleRow[]; canEdit: boolean }) {
  const t = useT(workflowsDict);
  const c = useT(commonDict);
  const d = useDomain();
  const f = useFormat();
  const lang = useLang();
  const { run, pending } = useMutation();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<RuleRow | null>(null);

  const toggle = (r: RuleRow, enabled: boolean) =>
    run(`/api/rules/${r.id}`, { method: "PATCH", body: { enabled } }, { success: enabled ? t.rules.toggledOn : t.rules.toggledOff }).catch(() => {});

  const remove = async () => {
    if (!deleting) return;
    try {
      await run(`/api/rules/${deleting.id}`, { method: "DELETE" }, { success: t.rules.deleted });
      setDeleting(null);
    } catch {
      /* toast shown */
    }
  };

  return (
    <div className="space-y-4">
      <Card as="div">
        <CardHeader
          title={t.rules.title}
          description={t.rules.subtitle}
          actions={
            canEdit && (
              <Button size="sm" variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing(emptyDraft())}>
                {t.rules.add}
              </Button>
            )
          }
        />
        {rules.length === 0 ? (
          <EmptyState title={t.rules.empty} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rules.map((r) => (
              <li key={r.id} className={cn("flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start sm:px-5", !r.enabled && "bg-slate-50/70")}>
                <div className="pt-0.5">
                  <Switch checked={r.enabled} onCheckedChange={(v) => toggle(r, v)} disabled={!canEdit || pending} label={`${t.rules.enabled}: ${r.name[lang]}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-semibold", r.enabled ? "text-slate-900" : "text-slate-500")}>{r.name[lang]}</p>
                  <p className={cn("mt-0.5 text-[13px] leading-relaxed", r.enabled ? "text-slate-700" : "text-slate-500")}>{ruleSentence(toRule(r), t, d, f)}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-500">{docTypesLabel(r.docTypes, t, d)}</span>
                    {r.action.type === "continue" && <Badge tone="success">{t.actionTypes.continue}</Badge>}
                    {!r.enabled && <Badge tone="neutral">{t.inactive}</Badge>}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <Button size="xs" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(toDraft(r))}>
                      {t.rules.edit}
                    </Button>
                    <Button size="xs" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => setDeleting(r)} className="text-red-700 hover:bg-red-50">
                      {t.rules.delete}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Callout tone="info" icon={<Info className="size-4 text-sky-600" />}>
        {t.rules.continueHint}
      </Callout>

      {editing && <RuleEditor draft={editing} onClose={() => setEditing(null)} />}

      <Dialog
        open={deleting != null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t.rules.deleteTitle}
        description={deleting ? fmt(t.rules.deleteText, { name: deleting.name[lang] }) : undefined}
        size="sm"
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>{c.cancel}</Button>
            <Button variant="danger" loading={pending} onClick={remove} icon={<Trash2 className="size-4" />}>
              {t.rules.delete}
            </Button>
          </>
        }
      />
    </div>
  );
}

function RuleEditor({ draft: initial, onClose }: { draft: Draft; onClose: () => void }) {
  const t = useT(workflowsDict);
  const c = useT(commonDict);
  const d = useDomain();
  const f = useFormat();
  const { run, pending } = useMutation();
  const [draft, setDraft] = useState<Draft>(initial);
  const [touched, setTouched] = useState(false);
  const nameError = draft.nameDe.trim().length < 3;
  const typesError = draft.docTypes !== "all" && draft.docTypes.length === 0;
  const continueError = draft.action.type === "continue" && draft.conditions.length === 0;
  const valueError = draft.conditions.some((cnd) => !isBooleanField(cnd.field) && (cnd.value.trim() === "" || !Number.isFinite(Number(cnd.value.replace(",", ".")))));

  const update = (patch: Partial<Draft>) => setDraft((p) => ({ ...p, ...patch }));
  const setCondition = (i: number, patch: Partial<Draft["conditions"][number]>) =>
    setDraft((p) => ({ ...p, conditions: p.conditions.map((cnd, j) => (j === i ? { ...cnd, ...patch } : cnd)) }));
  const changeField = (i: number, field: ConditionField) =>
    setCondition(i, isBooleanField(field) ? { field, op: "is_true", value: "" } : { field, op: "gt", value: draft.conditions[i].value && !isBooleanField(draft.conditions[i].field) ? draft.conditions[i].value : "0" });
  const changeAction = (type: RuleActionType) =>
    update({
      action:
        type === "require_approval"
          ? { type, role: draft.action.role ?? "manager" }
          : type === "notify" || type === "route_review"
            ? { type, department: draft.action.department ?? "sales" }
            : type === "set_priority"
              ? { type, priority: draft.action.priority ?? "high" }
              : { type },
    });
  const toggleType = (type: DocType) => {
    const current = draft.docTypes === "all" ? [] : draft.docTypes;
    update({ docTypes: current.includes(type) ? current.filter((x) => x !== type) : [...current, type] });
  };

  async function save() {
    setTouched(true);
    if (nameError || typesError || continueError || valueError) return;
    const body = {
      name: { de: draft.nameDe.trim(), en: draft.nameEn.trim() || undefined },
      enabled: draft.enabled,
      docTypes: draft.docTypes,
      conditions: draftConditions(draft),
      action: draft.action,
    };
    try {
      if (draft.id) await run(`/api/rules/${draft.id}`, { method: "PATCH", body }, { success: t.rules.updated });
      else await run("/api/rules", { body }, { success: t.rules.created });
      onClose();
    } catch {
      /* toast shown */
    }
  }

  const preview = ruleSentence({ conditions: draftConditions(draft), action: draft.action }, t, d, f);

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={draft.id ? t.editor.editTitle : t.editor.createTitle}
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button variant="primary" loading={pending} onClick={save}>
            {t.editor.save}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="rule-name">{t.editor.name}</Label>
            <Input id="rule-name" value={draft.nameDe} onChange={(e) => update({ nameDe: e.target.value })} placeholder={t.editor.namePlaceholder} invalid={touched && nameError} maxLength={140} />
            {touched && nameError && <p className="mt-1 text-xs text-red-600">{t.editor.nameRequired}</p>}
          </div>
          <div>
            <Label htmlFor="rule-name-en">{t.editor.nameEn}</Label>
            <Input id="rule-name-en" value={draft.nameEn} onChange={(e) => update({ nameEn: e.target.value })} maxLength={140} />
          </div>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-slate-700">{t.editor.docTypes}</legend>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={draft.docTypes === "all"} onClick={() => update({ docTypes: draft.docTypes === "all" ? ["purchase_order"] : "all" })}>
              {t.editor.allTypes}
            </Chip>
            {BUSINESS_DOC_TYPES.map((type) => (
              <Chip key={type} active={draft.docTypes !== "all" && draft.docTypes.includes(type)} onClick={() => toggleType(type)} disabled={draft.docTypes === "all"}>
                {d.docTypePlural[type]}
              </Chip>
            ))}
          </div>
          {touched && typesError && <p className="mt-1 text-xs text-red-600">{t.editor.typesRequired}</p>}
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-slate-700">{t.editor.conditions}</legend>
          {draft.conditions.length === 0 && <p className="mb-2 text-xs text-slate-500">{t.editor.noConditions}</p>}
          <div className="space-y-2">
            {draft.conditions.map((cnd, i) => {
              const bool = isBooleanField(cnd.field);
              return (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200 sm:flex-nowrap">
                  <Select value={cnd.field} onChange={(e) => changeField(i, e.target.value as ConditionField)} aria-label={t.editor.field} className="h-8 min-w-0 flex-[1_1_100%] text-[13px] sm:flex-[1.4_1_0]">
                    {CONDITION_FIELDS.map((cf) => (
                      <option key={cf} value={cf}>
                        {d.condition.field[cf]}
                      </option>
                    ))}
                  </Select>
                  <Select value={cnd.op} onChange={(e) => setCondition(i, { op: e.target.value as ConditionOp })} aria-label={t.editor.operator} className="h-8 min-w-0 flex-1 text-[13px]">
                    {(bool ? (["is_true", "is_false"] as ConditionOp[]) : NUMERIC_OPS).map((op) => (
                      <option key={op} value={op}>
                        {d.condition.op[op]}
                      </option>
                    ))}
                  </Select>
                  {!bool && (
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={cnd.value}
                      onChange={(e) => setCondition(i, { value: e.target.value })}
                      aria-label={t.editor.value}
                      className="tabular h-8 shrink-0 grow-0 basis-24 text-[13px] sm:basis-28"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => update({ conditions: draft.conditions.filter((_, j) => j !== i) })}
                    className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-red-600"
                    aria-label={t.editor.removeCondition}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
          {touched && valueError && <p className="mt-1 text-xs text-red-600">{t.editor.valueRequired}</p>}
          {touched && continueError && <p className="mt-1 text-xs text-red-600">{t.editor.continueNeedsCondition}</p>}
          {draft.conditions.length < 6 && (
            <Button size="xs" variant="ghost" icon={<Plus className="size-3.5" />} className="mt-2" onClick={() => update({ conditions: [...draft.conditions, { field: "partyKnown", op: "is_true", value: "" }] })}>
              {t.editor.addCondition}
            </Button>
          )}
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">{t.editor.action}</legend>
          <div>
            <Label htmlFor="rule-action">{t.editor.action}</Label>
            <Select id="rule-action" value={draft.action.type} onChange={(e) => changeAction(e.target.value as RuleActionType)}>
              {ACTION_TYPES.map((a) => (
                <option key={a} value={a}>
                  {t.actionTypes[a]}
                </option>
              ))}
            </Select>
          </div>
          {draft.action.type === "require_approval" && (
            <div>
              <Label htmlFor="rule-role">{t.editor.role}</Label>
              <Select id="rule-role" value={draft.action.role} onChange={(e) => update({ action: { ...draft.action, role: e.target.value as RuleAction["role"] } })}>
                {ROLES.filter((r) => r !== "viewer").map((r) => (
                  <option key={r} value={r}>
                    {d.role[r]}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {(draft.action.type === "notify" || draft.action.type === "route_review") && (
            <div>
              <Label htmlFor="rule-dep">{t.editor.department}</Label>
              <Select id="rule-dep" value={draft.action.department} onChange={(e) => update({ action: { ...draft.action, department: e.target.value as RuleAction["department"] } })}>
                {DEPARTMENTS.map((dep) => (
                  <option key={dep} value={dep}>
                    {d.department[dep]}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {draft.action.type === "set_priority" && (
            <div>
              <Label htmlFor="rule-prio">{t.editor.priority}</Label>
              <Select id="rule-prio" value={draft.action.priority} onChange={(e) => update({ action: { ...draft.action, priority: e.target.value as RuleAction["priority"] } })}>
                {(["high", "normal", "low"] as const).map((p) => (
                  <option key={p} value={p}>
                    {d.priority[p]}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Switch checked={draft.enabled} onCheckedChange={(v) => update({ enabled: v })} label={t.editor.enabledLabel} />
          {t.editor.enabledLabel}
        </label>

        <div className="rounded-lg bg-navy-50/60 px-3.5 py-3 ring-1 ring-navy-100">
          <p className="text-xs font-semibold tracking-wide text-navy-800 uppercase">{t.editor.preview}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-800">{preview}</p>
          <p className="mt-1 text-xs text-slate-500">{docTypesLabel(draft.docTypes === "all" || draft.docTypes.length ? draft.docTypes : [], t, d)}</p>
          {draft.action.type === "continue" && <p className="mt-1.5 text-xs text-slate-600">{t.rules.continueHint}</p>}
        </div>
      </div>
    </Dialog>
  );
}

function Chip({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors ring-inset disabled:cursor-not-allowed disabled:opacity-50",
        active ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}
