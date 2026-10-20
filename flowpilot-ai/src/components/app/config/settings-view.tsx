"use client";

import { AlertTriangle, Check, Database, Lock, Minus, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/domain/permissions";
import { INDUSTRY_KEYS, INDUSTRY_TEMPLATES, type IndustryKey } from "@/domain/templates";
import { BUSINESS_DOC_TYPES, FINANCIAL_DOC_TYPES, ROLES, type DocType, type Role } from "@/domain/types";
import { fmt } from "@/i18n/core";
import { useDomain, useFormat, useLang, useT } from "@/i18n/client";
import { commonDict } from "@/i18n/ui/common";
import { settingsDict, workflowsDict } from "@/i18n/ui/config";
import { useMutation } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import type { SettingsPageData } from "@/server/services/config-queries";
import { DeleteDemoData } from "../../consent/delete-demo";
import { Badge } from "../../ui/badge";
import { Button, ButtonLink } from "../../ui/button";
import { Card, CardHeader, PageHeader } from "../../ui/card";
import { Callout } from "../../ui/feedback";
import { Input, Label, Select, Switch } from "../../ui/form";
import { Dialog } from "../../ui/overlay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { useToast } from "../../ui/toast";
import { Avatar } from "../badges";

type TabKey = "general" | "users" | "automation" | "roi" | "privacy" | "demo";

interface Permissions {
  settings: boolean;
  users: boolean;
  retention: boolean;
  reset: boolean;
}

export function SettingsView({
  data,
  currentUserId,
  initialTab,
  permissions,
  demoTtlHours,
}: {
  data: SettingsPageData;
  currentUserId: string;
  initialTab: TabKey;
  permissions: Permissions;
  demoTtlHours: number;
}) {
  const t = useT(settingsDict);
  const tabs: TabKey[] = ["general", "users", "automation", "roi", "privacy", ...(data.workspace.isDemo ? (["demo"] as TabKey[]) : [])];
  return (
    <div>
      <PageHeader title={t.title} description={t.description} />
      {!permissions.settings && (
        <Callout tone="neutral" icon={<Lock className="size-4 text-slate-500" />} className="mb-4">
          {t.readOnly}
        </Callout>
      )}
      <Tabs defaultValue={initialTab}>
        <TabsList className="mb-4">
          {tabs.map((k) => (
            <TabsTrigger key={k} value={k}>
              {t.tabs[k]}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="general">
          <GeneralSection data={data} canEdit={permissions.settings} />
        </TabsContent>
        <TabsContent value="users">
          <UsersSection data={data} canManage={permissions.users} currentUserId={currentUserId} />
        </TabsContent>
        <TabsContent value="automation">
          <AutomationSection data={data} />
        </TabsContent>
        <TabsContent value="roi">
          <RoiSection data={data} canEdit={permissions.settings} />
        </TabsContent>
        <TabsContent value="privacy">
          <PrivacySection data={data} canEdit={permissions.settings && permissions.retention} />
          {data.workspace.isDemo && (
            <div className="mt-4 max-w-3xl">
              <DeleteDemoData ttlHours={demoTtlHours} />
            </div>
          )}
        </TabsContent>
        {data.workspace.isDemo && (
          <TabsContent value="demo">
            <DemoSection data={data} canReset={permissions.reset} />
            <div className="mt-4 max-w-3xl">
              <DeleteDemoData ttlHours={demoTtlHours} />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function SaveBar({ dirty, pending, onSave, onReset, canEdit }: { dirty: boolean; pending: boolean; onSave: () => void; onReset: () => void; canEdit: boolean }) {
  const t = useT(settingsDict);
  const w = useT(workflowsDict);
  if (!canEdit) return null;
  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-5", dirty && "bg-blue-50/60")}>
      {dirty && <span className="mr-auto text-xs font-medium text-blue-800">{w.params.unsaved}</span>}
      <Button size="sm" variant="ghost" onClick={onReset} disabled={!dirty || pending}>
        {w.params.discard}
      </Button>
      <Button size="sm" variant="primary" onClick={onSave} disabled={!dirty} loading={pending}>
        {t.save}
      </Button>
    </div>
  );
}

/* ---------- General ---------- */

function GeneralSection({ data, canEdit }: { data: SettingsPageData; canEdit: boolean }) {
  const t = useT(settingsDict);
  const w = useT(workflowsDict);
  const { run, pending } = useMutation();
  const initial = { companyName: data.settings.companyName, fourEyes: data.settings.fourEyes };
  const [draft, setDraft] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const save = () => run("/api/settings", { method: "PATCH", body: { section: "general", ...draft } }, { success: t.saved }).catch(() => {});
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card as="div" className="self-start">
        <CardHeader title={t.general.company} />
        <div className="space-y-5 px-4 py-4 sm:px-5">
          <div>
            <Label htmlFor="company">{t.general.companyName}</Label>
            <Input id="company" value={draft.companyName} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} disabled={!canEdit} maxLength={120} />
            <p className="mt-1 text-xs text-slate-500">{t.general.companyHint}</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{t.general.control}</p>
            <div className="flex items-start justify-between gap-4">
              <label htmlFor="four-eyes" className="text-[13px] font-medium text-slate-800">
                {t.general.fourEyes}
              </label>
              <Switch id="four-eyes" checked={draft.fourEyes} onCheckedChange={(v) => setDraft({ ...draft, fourEyes: v })} disabled={!canEdit} label={t.general.fourEyes} />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.general.fourEyesHint}</p>
          </div>
        </div>
        <SaveBar dirty={dirty && draft.companyName.trim().length >= 2} pending={pending} onSave={save} onReset={() => setDraft(initial)} canEdit={canEdit} />
      </Card>
      <Card as="div" className="self-start">
        <CardHeader title={t.general.guardrails} description={t.general.guardrailsHint} icon={<ShieldCheck className="size-4 text-navy-700" />} />
        <ul className="space-y-2 px-4 py-4 sm:px-5">
          {w.guardrails.items.map((g) => (
            <li key={g} className="flex gap-2 text-[13px] leading-relaxed text-slate-700">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
              {g}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ---------- Users & roles ---------- */

function UsersSection({ data, canManage, currentUserId }: { data: SettingsPageData; canManage: boolean; currentUserId: string }) {
  const t = useT(settingsDict);
  const d = useDomain();
  const lang = useLang();
  const { run, pending } = useMutation();
  const changeRole = (id: string, role: Role) => run(`/api/users/${id}`, { method: "PATCH", body: { role } }, { success: t.users.roleChanged }).catch(() => {});
  return (
    <div className="space-y-4">
      <Card as="div">
        <CardHeader title={t.users.title} description={t.users.subtitle} />
        {!canManage && <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500 sm:px-5">{t.users.manageHint}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs text-slate-500">
                <th className="px-4 py-2.5 font-medium sm:px-5">{t.users.name}</th>
                <th className="px-3 py-2.5 font-medium">{t.users.function}</th>
                <th className="px-3 py-2.5 font-medium">{t.users.department}</th>
                <th className="px-4 py-2.5 font-medium sm:px-5">{t.users.role}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2.5 sm:px-5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">
                          {u.name}
                          {u.id === currentUserId && <span className="ml-1.5 rounded bg-slate-100 px-1 text-[11px] font-medium text-slate-600">{t.users.you}</span>}
                        </p>
                        <p className="truncate text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[13px] text-slate-600">{u.title[lang]}</td>
                  <td className="px-3 py-2.5 text-[13px] text-slate-600">{d.department[u.department as keyof typeof d.department]}</td>
                  <td className="px-4 py-2.5 sm:px-5">
                    {canManage ? (
                      <Select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value as Role)}
                        disabled={pending}
                        aria-label={`${t.users.role}: ${u.name}`}
                        className="h-8 max-w-44 text-[13px]"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {d.role[r]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Badge tone={u.role === "admin" ? "navy" : u.role === "manager" ? "info" : "neutral"}>{d.role[u.role as Role]}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card as="div">
        <CardHeader title={t.users.matrix} description={t.users.matrixHint} />
        <div className="grid gap-3 border-b border-slate-100 px-4 py-3 sm:grid-cols-2 sm:px-5 xl:grid-cols-4">
          {ROLES.map((r) => (
            <div key={r} className="text-[13px]">
              <p className="font-semibold text-slate-900">{d.role[r]}</p>
              <p className="mt-0.5 text-xs leading-snug text-slate-500">{d.roleDescription[r]}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs text-slate-500">
                <th className="px-4 py-2.5 font-medium sm:px-5">{t.users.permission}</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-2 py-2.5 text-center font-medium">
                    {d.role[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {PERMISSIONS.map((p) => (
                <tr key={p}>
                  <td className="px-4 py-2 text-slate-700 sm:px-5">{t.permissions[p]}</td>
                  {ROLES.map((r) => {
                    const has = ROLE_PERMISSIONS[r].includes(p);
                    return (
                      <td key={r} className="px-2 py-2 text-center">
                        {has ? <Check className="mx-auto size-4 text-emerald-600" aria-label="✓" /> : <Minus className="mx-auto size-4 text-slate-300" aria-label="–" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Automation overview ---------- */

function AutomationSection({ data }: { data: SettingsPageData }) {
  const t = useT(settingsDict);
  const w = useT(workflowsDict);
  const d = useDomain();
  const f = useFormat();
  const lang = useLang();
  const money = (v: number | null) => (v == null ? t.automation.noLimit : f.money(v, { decimals: 0 }));
  return (
    <Card as="div">
      <CardHeader
        title={t.automation.title}
        description={t.automation.subtitle}
        actions={
          <ButtonLink href="/app/workflows" size="sm">
            {t.automation.edit}
          </ButtonLink>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs text-slate-500">
              <th className="px-4 py-2.5 font-medium sm:px-5">{t.automation.workflow}</th>
              <th className="px-3 py-2.5 font-medium">{t.automation.status}</th>
              <th className="px-3 py-2.5 font-medium">{t.automation.auto}</th>
              <th className="px-3 py-2.5 text-right font-medium">{t.automation.minConfidence}</th>
              <th className="px-3 py-2.5 text-right font-medium">{t.automation.autoLimit}</th>
              <th className="px-4 py-2.5 text-right font-medium sm:px-5">{t.automation.approvalLimit}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.workflows.map((wf) => {
              const locked = (wf.docTypes as DocType[]).some((x) => FINANCIAL_DOC_TYPES.includes(x));
              return (
                <tr key={wf.id}>
                  <td className="px-4 py-2.5 sm:px-5">
                    <Link href={`/app/workflows?workflow=${wf.id}`} className="font-medium text-slate-900 hover:underline">
                      {wf.name[lang]}
                    </Link>
                    <span className="block text-xs text-slate-500">{(wf.docTypes as DocType[]).map((x) => d.docTypePlural[x]).join(", ")}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={wf.active ? "success" : "neutral"} dot>
                      {wf.active ? w.active : w.inactive}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    {locked ? (
                      <Badge tone="neutral" icon={<Lock className="size-3" />}>
                        {t.automation.locked}
                      </Badge>
                    ) : (
                      <Badge tone={wf.params.autoProcess ? "success" : "neutral"}>{wf.params.autoProcess ? t.automation.allowed : t.automation.notAllowed}</Badge>
                    )}
                  </td>
                  <td className="tabular px-3 py-2.5 text-right text-slate-700">{f.percent(wf.params.minConfidence)}</td>
                  <td className="tabular px-3 py-2.5 text-right text-slate-700">{locked || !wf.params.autoProcess ? "—" : money(wf.params.maxAutoAmount)}</td>
                  <td className="tabular px-4 py-2.5 text-right text-slate-700 sm:px-5">{money(wf.params.approvalLimit)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
        <p className="text-xs leading-relaxed text-slate-500">
          <span className="font-medium text-slate-700">{w.guardrails.title}: </span>
          {w.guardrails.items.join(" ")}
        </p>
      </div>
    </Card>
  );
}

/* ---------- ROI assumptions ---------- */

function RoiSection({ data, canEdit }: { data: SettingsPageData; canEdit: boolean }) {
  const t = useT(settingsDict);
  const d = useDomain();
  const { run, pending } = useMutation();
  const initial = data.settings.roi;
  const [draft, setDraft] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const num = (v: string, max: number) => Math.max(0, Math.min(max, Number(v.replace(",", ".")) || 0));
  const save = () => run("/api/settings", { method: "PATCH", body: { section: "roi", roi: draft } }, { success: t.saved }).catch(() => {});

  const field = (id: string, label: string, value: number, unit: string, onChange: (v: number) => void, max: number, step = 1) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input id={id} type="number" min={0} max={max} step={step} value={value} onChange={(e) => onChange(num(e.target.value, max))} disabled={!canEdit} className="tabular" />
        <span className="w-16 shrink-0 text-xs text-slate-500">{unit}</span>
      </div>
    </div>
  );

  return (
    <Card as="div">
      <CardHeader title={t.roi.title} description={t.roi.subtitle} />
      <div className="grid gap-6 px-4 py-4 sm:px-5 lg:grid-cols-2">
        <div className="space-y-4">
          {field("roi-rate", t.roi.hourlyRate, draft.hourlyRate, t.roi.perHour, (v) => setDraft({ ...draft, hourlyRate: v }), 500)}
          {field("roi-auto", t.roi.autoCheck, draft.autoCheckMinutes, t.roi.minutes, (v) => setDraft({ ...draft, autoCheckMinutes: v }), 60, 0.5)}
          {field("roi-review", t.roi.defaultReview, draft.defaultReviewMinutes, t.roi.minutes, (v) => setDraft({ ...draft, defaultReviewMinutes: v }), 120, 0.5)}
          {field("roi-platform", t.roi.platform, draft.platformMonthlyCost, t.roi.perMonth, (v) => setDraft({ ...draft, platformMonthlyCost: v }), 100000, 10)}
          {field("roi-impl", t.roi.implementation, draft.implementationCost, t.roi.euro, (v) => setDraft({ ...draft, implementationCost: v }), 1000000, 100)}
          <div>
            {field("roi-confirmed", t.roi.confirmed, draft.confirmedMonthlySavings, t.roi.perMonth, (v) => setDraft({ ...draft, confirmedMonthlySavings: v }), 1000000, 10)}
            <Callout tone="warning" icon={<AlertTriangle className="size-4" />} className="mt-2">
              {t.roi.confirmedWarning}
            </Callout>
          </div>
        </div>
        <fieldset>
          <legend className="text-[13px] font-medium text-slate-700">{t.roi.baseline}</legend>
          <p className="mb-3 text-xs text-slate-500">{t.roi.baselineHint}</p>
          <div className="space-y-2.5">
            {BUSINESS_DOC_TYPES.map((type) => (
              <div key={type} className="flex items-center justify-between gap-3">
                <label htmlFor={`base-${type}`} className="text-[13px] text-slate-700">
                  {d.docTypePlural[type]}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`base-${type}`}
                    type="number"
                    min={0}
                    max={240}
                    step={0.5}
                    value={draft.baselineMinutes[type] ?? 0}
                    onChange={(e) => setDraft({ ...draft, baselineMinutes: { ...draft.baselineMinutes, [type]: num(e.target.value, 240) } })}
                    disabled={!canEdit}
                    className="tabular w-24"
                  />
                  <span className="w-10 text-xs text-slate-500">{t.roi.minutes}</span>
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      </div>
      <SaveBar dirty={dirty} pending={pending} onSave={save} onReset={() => setDraft(initial)} canEdit={canEdit} />
    </Card>
  );
}

/* ---------- Privacy & retention ---------- */

function PrivacySection({ data, canEdit }: { data: SettingsPageData; canEdit: boolean }) {
  const t = useT(settingsDict);
  const c = useT(commonDict);
  const { push } = useToast();
  const { run, pending } = useMutation();
  const initial = { retentionDays: data.settings.retentionDays, retentionScope: data.settings.retentionScope };
  const [draft, setDraft] = useState(initial);
  const [dryRun, setDryRun] = useState<{ count: number; days: number } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const save = () => run("/api/settings", { method: "PATCH", body: { section: "privacy", ...draft } }, { success: t.saved }).catch(() => {});
  const test = async () => {
    try {
      setDryRun(await run<{ count: number; days: number }>("/api/retention", { body: { dryRun: true, days: draft.retentionDays } }, { refresh: false }));
    } catch {
      /* toast shown */
    }
  };
  const apply = async () => {
    try {
      const res = await run<{ count: number }>("/api/retention", { body: { dryRun: false } });
      push({ tone: "success", title: fmt(t.privacy.applied, { n: res.count }) });
      setConfirm(false);
      setDryRun(null);
    } catch {
      /* toast shown */
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card as="div" className="self-start">
        <CardHeader title={t.privacy.title} description={t.privacy.subtitle} />
        <div className="space-y-4 px-4 py-4 sm:px-5">
          {!canEdit && <Callout tone="neutral" icon={<Lock className="size-4 text-slate-500" />}>{t.privacy.noPermission}</Callout>}
          <div>
            <Label htmlFor="ret-days">{t.privacy.days}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="ret-days"
                type="number"
                min={7}
                max={3650}
                value={draft.retentionDays}
                onChange={(e) => setDraft({ ...draft, retentionDays: Math.max(7, Math.min(3650, Math.round(Number(e.target.value) || 7))) })}
                disabled={!canEdit}
                className="tabular w-28"
              />
              <span className="text-xs text-slate-500">{t.privacy.daysUnit}</span>
            </div>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-slate-700">{t.privacy.scope}</legend>
            <div className="space-y-1.5">
              {(["files", "files_and_text"] as const).map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-[13px] text-slate-700">
                  <input
                    type="radio"
                    name="ret-scope"
                    value={scope}
                    checked={draft.retentionScope === scope}
                    onChange={() => setDraft({ ...draft, retentionScope: scope })}
                    disabled={!canEdit}
                    className="accent-navy-800"
                  />
                  {scope === "files" ? t.privacy.scopeFiles : t.privacy.scopeFilesText}
                </label>
              ))}
            </div>
          </fieldset>
          <Callout tone="warning" icon={<AlertTriangle className="size-4" />}>
            {t.privacy.legal}
          </Callout>
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={test} loading={pending && !confirm}>
                {t.privacy.dryRun}
              </Button>
              <Button size="sm" variant="danger" onClick={() => setConfirm(true)} disabled={dirty || !dryRun || dryRun.count === 0}>
                {t.privacy.apply}
              </Button>
            </div>
          )}
          {dryRun && <p className="text-[13px] font-medium text-slate-700">{fmt(t.privacy.dryRunResult, { n: dryRun.count, days: dryRun.days })}</p>}
        </div>
        <SaveBar dirty={dirty} pending={pending} onSave={save} onReset={() => setDraft(initial)} canEdit={canEdit} />
      </Card>
      <Card as="div" className="self-start">
        <CardHeader title={t.privacy.storage} icon={<Database className="size-4" />} />
        <ul className="space-y-2 px-4 py-4 sm:px-5">
          {t.privacy.storageItems.map((item) => (
            <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-slate-700">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-slate-400" />
              {item}
            </li>
          ))}
        </ul>
        <p className="border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-500 sm:px-5">{t.privacy.noClaim}</p>
      </Card>
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t.privacy.applyTitle}
        description={fmt(t.privacy.applyText, { n: dryRun?.count ?? 0 })}
        size="sm"
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>{c.cancel}</Button>
            <Button variant="danger" loading={pending} onClick={apply}>
              {t.privacy.apply}
            </Button>
          </>
        }
      />
    </div>
  );
}

/* ---------- Demo ---------- */

function DemoSection({ data, canReset }: { data: SettingsPageData; canReset: boolean }) {
  const t = useT(settingsDict);
  const c = useT(commonDict);
  const lang = useLang();
  const router = useRouter();
  const { run, pending } = useMutation();
  const [industry, setIndustry] = useState<IndustryKey>(data.workspace.industry as IndustryKey);
  const [confirm, setConfirm] = useState<null | "reset" | "industry">(null);
  const go = async () => {
    try {
      await run("/api/demo/reset", { body: confirm === "industry" ? { industry } : {} }, { success: t.demo.done });
      setConfirm(null);
      router.push("/app/inbox?tour=1");
    } catch {
      /* toast shown */
    }
  };
  return (
    <Card as="div" className="max-w-3xl">
      <CardHeader title={t.demo.title} description={t.demo.subtitle} />
      <div className="space-y-5 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="demo-industry">{t.demo.industry}</Label>
            <Select id="demo-industry" value={industry} onChange={(e) => setIndustry(e.target.value as IndustryKey)} disabled={!canReset}>
              {INDUSTRY_KEYS.map((k) => (
                <option key={k} value={k}>
                  {INDUSTRY_TEMPLATES[k].name[lang]}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="primary" onClick={() => setConfirm("industry")} disabled={!canReset || pending}>
            {t.demo.change}
          </Button>
        </div>
        <p className="text-[13px] text-slate-600">{INDUSTRY_TEMPLATES[industry].focus[lang]}</p>
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-slate-600">{t.demo.resetText}</p>
          <Button icon={<RotateCcw className="size-4" />} onClick={() => setConfirm("reset")} disabled={!canReset || pending}>
            {t.demo.reset}
          </Button>
        </div>
      </div>
      <Dialog
        open={confirm != null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "industry" ? c.changeIndustry : c.resetDemo}
        description={confirm === "industry" ? c.changeIndustryConfirm : c.resetDemoConfirm}
        size="sm"
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>{c.cancel}</Button>
            <Button variant="primary" loading={pending} onClick={go}>
              {c.confirm}
            </Button>
          </>
        }
      />
    </Card>
  );
}
