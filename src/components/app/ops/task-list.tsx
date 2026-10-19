"use client";

import { AlarmClock, ArrowRight, Check, CheckCircle2, Circle, Copy, ListChecks, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { DEPARTMENTS, type DocType } from "@/domain/types";
import { fmt } from "@/i18n/core";
import { useDomain, useFormat, useLang, useT } from "@/i18n/client";
import { tasksDict } from "@/i18n/ui/ops";
import { useMutation } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import type { TaskItem } from "@/server/services/queries";
import { Badge } from "../../ui/badge";
import { Button, ButtonLink } from "../../ui/button";
import { Card, PageHeader } from "../../ui/card";
import { EmptyState } from "../../ui/feedback";
import { Select, Switch } from "../../ui/form";
import { Tooltip } from "../../ui/overlay";
import { Segmented } from "../../ui/tabs";
import { Avatar, DocTypeBadge, PriorityBadge } from "../badges";

type StatusFilter = "open" | "done";

export function TaskList({
  tasks,
  users,
  currentUserId,
  canManage,
}: {
  tasks: TaskItem[];
  users: { id: string; name: string }[];
  currentUserId: string;
  canManage: boolean;
}) {
  const t = useT(tasksDict);
  const d = useDomain();
  const [status, setStatus] = useState<StatusFilter>("open");
  const [department, setDepartment] = useState<string>("all");
  const [mine, setMine] = useState(false);
  const now = Date.now();

  const isOpen = (task: TaskItem) => task.status === "open";
  const filtered = useMemo(
    () =>
      tasks
        .filter((task) => (status === "open" ? isOpen(task) : !isOpen(task)))
        .filter((task) => department === "all" || task.department === department)
        .filter((task) => !mine || task.assigneeId === currentUserId)
        .sort((a, b) => {
          if (status === "done") return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
          const prio = { high: 0, normal: 1, low: 2 } as const;
          const ao = a.dueAt && Date.parse(a.dueAt) < now ? 0 : 1;
          const bo = b.dueAt && Date.parse(b.dueAt) < now ? 0 : 1;
          return ao - bo || prio[a.priority] - prio[b.priority] || (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9");
        }),
    [tasks, status, department, mine, currentUserId, now],
  );

  const openCount = tasks.filter(isOpen).length;
  const overdueCount = tasks.filter((task) => isOpen(task) && task.dueAt && Date.parse(task.dueAt) < now).length;

  return (
    <div>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={overdueCount > 0 ? <Badge tone="danger" icon={<AlarmClock className="size-3" />}>{fmt(t.overdueCount, { n: overdueCount })}</Badge> : undefined}
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Segmented<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { value: "open", label: t.open, count: openCount },
            { value: "done", label: t.done, count: tasks.length - openCount },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-56">
            <Select value={department} onChange={(e) => setDepartment(e.target.value)} aria-label={t.department}>
              <option value="all">{t.allDepartments}</option>
              {DEPARTMENTS.map((dep) => (
                <option key={dep} value={dep}>
                  {d.department[dep]}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-slate-700">
            <Switch checked={mine} onCheckedChange={setMine} label={t.mine} />
            {t.mine}
          </label>
        </div>
      </div>

      <Card className="overflow-hidden" as="div">
        {filtered.length === 0 ? (
          <EmptyState icon={<ListChecks className="size-5" />} title={t.empty} text={t.emptyText} />
        ) : (
          <ul className="divide-y divide-slate-100" aria-label={fmt(t.count, { n: filtered.length })}>
            {filtered.map((task) => (
              <TaskRow key={task.id} task={task} assignee={users.find((u) => u.id === task.assigneeId)?.name ?? null} canManage={canManage} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function TaskRow({ task, assignee, canManage }: { task: TaskItem; assignee: string | null; canManage: boolean }) {
  const t = useT(tasksDict);
  const d = useDomain();
  const f = useFormat();
  const lang = useLang();
  const { run, pending } = useMutation();
  const [showDraft, setShowDraft] = useState(false);
  const [copied, setCopied] = useState(false);
  const open = task.status === "open";
  const overdue = open && task.dueAt != null && Date.parse(task.dueAt) < Date.now();
  const synthetic = !task.documentId && (task.note ?? "").startsWith("Synthetische");
  const hasDraft = task.type === "info_request" && !!task.note;

  const toggle = () =>
    run(`/api/tasks/${task.id}`, { method: "PATCH", body: { status: open ? "done" : "open" } }, { success: open ? t.markedDone : t.reopened });

  return (
    <li className={cn("px-4 py-3.5 sm:px-5", overdue && "bg-red-50/40")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 gap-3">
          <span className="mt-0.5 shrink-0" aria-hidden>
            {open ? <Circle className={cn("size-4", overdue ? "text-red-500" : "text-slate-300")} /> : <CheckCircle2 className="size-4 text-emerald-600" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm leading-snug font-medium", open ? "text-slate-900" : "text-slate-500 line-through decoration-slate-300")}>
              {task.title[lang] ?? task.title.de}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {!task.documentId && <Badge tone="outline">{d.taskType[task.type]}</Badge>}
              {task.document?.docType && <DocTypeBadge type={task.document.docType as DocType} />}
              <PriorityBadge priority={task.priority} />
              <Badge tone="neutral">{d.department[task.department as keyof typeof d.department] ?? task.department}</Badge>
              {synthetic && <Badge tone="ai">{t.synthetic}</Badge>}
              {task.document?.netAmount != null && <span className="tabular text-xs text-slate-500">{f.money(task.document.grossAmount ?? task.document.netAmount)}</span>}
            </div>
            {hasDraft && (
              <div className="mt-2">
                <button type="button" onClick={() => setShowDraft((v) => !v)} className="text-[13px] font-medium text-slate-600 hover:text-slate-900" aria-expanded={showDraft}>
                  {t.draft} {showDraft ? "▴" : "▾"}
                </button>
                {showDraft && (
                  <div className="mt-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                    <pre className="font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-slate-800">{task.note}</pre>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">{t.draftHint}</span>
                      <Button
                        size="xs"
                        icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(task.note ?? "");
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          } catch {
                            /* clipboard unavailable */
                          }
                        }}
                      >
                        {copied ? t.copied : t.copy}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-7 md:shrink-0 md:flex-nowrap md:justify-end md:pl-0">
          <span className="flex min-w-0 items-center gap-1.5 text-[13px] whitespace-nowrap text-slate-600">
            {assignee ? <Avatar name={assignee} className="size-5 text-[9px]" /> : null}
            <span className="truncate">{assignee ?? t.unassigned}</span>
          </span>
          <span className={cn("tabular text-[13px] whitespace-nowrap", overdue ? "font-medium text-red-700" : "text-slate-500")}>
            {open
              ? task.dueAt
                ? overdue
                  ? `${t.overdue} · ${f.relative(task.dueAt)}`
                  : fmt(t.dueRel, { rel: f.relative(task.dueAt) })
                : t.noDue
              : task.completedAt
                ? fmt(t.completedRel, { rel: f.relative(task.completedAt) })
                : t.done}
          </span>
          {task.documentId ? (
            <Tooltip content={open ? t.docBound : null}>
              <span>
                <ButtonLink href={`/app/documents/${task.documentId}`} size="xs" variant={open ? "primary" : "secondary"}>
                  {t.openDocument} <ArrowRight className="size-3.5" />
                </ButtonLink>
              </span>
            </Tooltip>
          ) : (
            <Button
              size="xs"
              variant={open ? "success" : "ghost"}
              icon={open ? <Check className="size-3.5" /> : <RotateCcw className="size-3.5" />}
              onClick={toggle}
              disabled={!canManage || pending}
              loading={pending}
            >
              {open ? t.markDone : t.reopen}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
