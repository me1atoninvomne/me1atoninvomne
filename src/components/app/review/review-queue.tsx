"use client";

import { ArrowRight, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { DocType } from "@/domain/types";
import { useDomain, useFormat, useT } from "@/i18n/client";
import { issueText } from "@/i18n/domain";
import { commonDict } from "@/i18n/ui/common";
import { reviewDict } from "@/i18n/ui/review";
import { cn } from "@/lib/cn";
import type { DocListItem } from "@/server/services/queries";
import { ButtonLink } from "../../ui/button";
import { Card, PageHeader } from "../../ui/card";
import { EmptyState } from "../../ui/feedback";
import { Segmented } from "../../ui/tabs";
import { DocTypeBadge, PriorityBadge, SeverityIcon, StatusBadge } from "../badges";

type Filter = "all" | "needs_review" | "needs_approval" | "info_requested";

export function ReviewQueue({ items, users }: { items: DocListItem[]; users: { id: string; name: string }[] }) {
  const t = useT(reviewDict);
  const c = useT(commonDict);
  const d = useDomain();
  const f = useFormat();
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => items.filter((i) => filter === "all" || i.status === filter), [items, filter]);
  const count = (s: Filter) => (s === "all" ? items.length : items.filter((i) => i.status === s).length);
  const now = new Date();

  return (
    <div>
      <PageHeader title={t.queueTitle} description={t.queueDescription} />
      <div className="mb-3">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: c.all, count: count("all") },
            { value: "needs_review", label: d.status.needs_review, count: count("needs_review") },
            { value: "needs_approval", label: d.status.needs_approval, count: count("needs_approval") },
            { value: "info_requested", label: d.status.info_requested, count: count("info_requested") },
          ]}
        />
      </div>
      <Card className="overflow-hidden" as="div">
        {visible.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="size-5" />}
            title={t.queueEmpty}
            text={t.queueEmptyText}
            action={
              <ButtonLink href="/app/inbox" size="sm">
                {t.queueToInbox}
              </ButtonLink>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs text-slate-500">
                  <th className="px-5 py-2.5 font-medium">{t.columns.document}</th>
                  <th className="px-3 py-2.5 font-medium">{t.columns.finding}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t.columns.amount}</th>
                  <th className="px-3 py-2.5 font-medium">{t.columns.due}</th>
                  <th className="px-3 py-2.5 font-medium">{t.columns.assignee}</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((item) => {
                  const top = item.topIssue;
                  const overdue = item.dueAt && new Date(item.dueAt) < now;
                  return (
                    <tr key={item.id} className="group hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <Link href={`/app/documents/${item.id}`} className="block">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <DocTypeBadge type={item.docType} />
                            <StatusBadge status={item.status} />
                            <PriorityBadge priority={item.priority} />
                          </span>
                          <span className="mt-1.5 block font-medium text-slate-900 group-hover:underline">{item.documentNumber ?? item.fileName ?? "—"}</span>
                          <span className="block text-[13px] text-slate-500">{item.partyName ?? "—"}</span>
                        </Link>
                      </td>
                      <td className="max-w-sm px-3 py-3">
                        {top ? (
                          <span className="flex items-start gap-1.5 text-[13px] text-slate-700">
                            <SeverityIcon severity={top.severity} className="mt-0.5 size-3.5 shrink-0" />
                            {issueText(top, d, f, item.docType as DocType).title}
                          </span>
                        ) : (
                          <span className="text-[13px] text-slate-500">—</span>
                        )}
                        {item.critical + item.warnings > 1 && <span className="mt-0.5 block text-xs text-slate-500">+{item.critical + item.warnings - 1}</span>}
                      </td>
                      <td className="tabular px-3 py-3 text-right font-medium text-slate-900">{f.money(item.grossAmount ?? item.netAmount)}</td>
                      <td className={cn("px-3 py-3 text-[13px]", overdue ? "font-medium text-red-700" : "text-slate-600")}>{item.dueAt ? f.relative(item.dueAt) : "—"}</td>
                      <td className="px-3 py-3 text-[13px] text-slate-600">
                        {users.find((u) => u.id === item.assigneeId)?.name ?? "—"}
                        <span className="block text-xs text-slate-500">{item.department ? d.department[item.department as keyof typeof d.department] : ""}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ButtonLink href={`/app/documents/${item.id}`} size="xs" variant="primary">
                          {d.taskType.review} <ArrowRight className="size-3.5" />
                        </ButtonLink>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {visible.map((item) => (
                <li key={item.id}>
                  <Link href={`/app/documents/${item.id}`} className="block px-4 py-3">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <DocTypeBadge type={item.docType} />
                      <StatusBadge status={item.status} />
                    </span>
                    <span className="mt-1.5 flex items-baseline justify-between gap-2">
                      <span className="font-medium text-slate-900">{item.documentNumber ?? item.fileName ?? "—"}</span>
                      <span className="tabular text-sm font-medium">{f.money(item.grossAmount ?? item.netAmount)}</span>
                    </span>
                    <span className="block text-[13px] text-slate-500">{item.partyName}</span>
                    {item.topIssue && (
                      <span className="mt-1 flex items-start gap-1.5 text-[13px] text-slate-700">
                        <SeverityIcon severity={item.topIssue.severity} className="mt-0.5 size-3.5 shrink-0" />
                        {issueText(item.topIssue, d, f, item.docType as DocType).title}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
