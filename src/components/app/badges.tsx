"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  CircleDot,
  Clock,
  FileQuestion,
  Info,
  Mail,
  OctagonAlert,
  Receipt,
  ShoppingCart,
  Truck,
  UserCheck,
} from "lucide-react";
import type { DocType, Severity } from "@/domain/types";
import { useDomain, useFormat, useLang } from "@/i18n/client";
import type { DocumentStatus } from "@/server/db/schema";
import { cn } from "@/lib/cn";
import { Badge, type Tone } from "../ui/badge";

export const DOC_ICON: Record<DocType, React.ComponentType<{ className?: string }>> = {
  purchase_order: ShoppingCart,
  invoice: Receipt,
  order_confirmation: BadgeCheck,
  delivery_note: Truck,
  rfq: FileQuestion,
  delay_notice: Clock,
  other: Mail,
};

export function DocTypeBadge({ type, className }: { type: DocType | string | null; className?: string }) {
  const d = useDomain();
  if (!type) return <Badge tone="neutral">{d.status.received}</Badge>;
  const Icon = DOC_ICON[type as DocType] ?? Mail;
  return (
    <Badge tone="outline" icon={<Icon className="size-3 text-slate-500" />} className={className}>
      {d.docType[type as DocType] ?? type}
    </Badge>
  );
}

const STATUS_TONE: Record<DocumentStatus, Tone> = {
  received: "neutral",
  auto_processed: "success",
  exported: "success",
  approved: "success",
  needs_review: "warning",
  needs_approval: "info",
  info_requested: "ai",
  rejected: "danger",
  ignored: "neutral",
  error: "danger",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const d = useDomain();
  return (
    <Badge tone={STATUS_TONE[status]} dot>
      {d.status[status]}
    </Badge>
  );
}

export function RouteBadge({ route }: { route: "auto" | "review" | "approval" | "ignore" | null }) {
  const d = useDomain();
  if (!route) return null;
  const map = {
    auto: { tone: "success" as Tone, icon: <Bot className="size-3" /> },
    review: { tone: "warning" as Tone, icon: <UserCheck className="size-3" /> },
    approval: { tone: "info" as Tone, icon: <UserCheck className="size-3" /> },
    ignore: { tone: "neutral" as Tone, icon: <CircleDot className="size-3" /> },
  }[route];
  return (
    <Badge tone={map.tone} icon={map.icon}>
      {d.route[route]}
    </Badge>
  );
}

export function SeverityIcon({ severity, className }: { severity: Severity; className?: string }) {
  if (severity === "critical") return <OctagonAlert className={cn("size-4 text-red-600", className)} aria-hidden />;
  if (severity === "warning") return <AlertTriangle className={cn("size-4 text-amber-600", className)} aria-hidden />;
  return <Info className={cn("size-4 text-sky-600", className)} aria-hidden />;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const d = useDomain();
  const tone: Tone = severity === "critical" ? "danger" : severity === "warning" ? "warning" : "info";
  return <Badge tone={tone}>{d.severity[severity]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: "high" | "normal" | "low" | null }) {
  const d = useDomain();
  if (!priority || priority === "normal") return null;
  return <Badge tone={priority === "high" ? "danger" : "neutral"}>{d.priority[priority]}</Badge>;
}

export function confidenceLevel(c: number): "high" | "medium" | "low" | "none" {
  if (c <= 0) return "none";
  if (c >= 0.9) return "high";
  if (c >= 0.75) return "medium";
  return "low";
}

export function ConfidenceBadge({ value, compact }: { value: number; compact?: boolean }) {
  const lang = useLang();
  const f = useFormat();
  const level = confidenceLevel(value);
  const label = {
    de: { high: "Hoch", medium: "Mittel", low: "Niedrig", none: "Nicht erkannt" },
    en: { high: "High", medium: "Medium", low: "Low", none: "Not recognised" },
  }[lang][level];
  const tone: Tone = level === "high" ? "success" : level === "medium" ? "warning" : "danger";
  const title = lang === "de" ? `Erkennungssicherheit ${f.percent(value)}` : `Recognition confidence ${f.percent(value)}`;
  if (compact)
    return (
      <span title={title} className={cn("tabular inline-flex items-center gap-1 text-xs font-medium", level === "high" ? "text-emerald-700" : level === "medium" ? "text-amber-700" : "text-red-700")}>
        <span className={cn("size-1.5 rounded-full", level === "high" ? "bg-emerald-500" : level === "medium" ? "bg-amber-500" : "bg-red-500")} />
        {level === "none" ? label : f.percent(value)}
      </span>
    );
  return (
    <Badge tone={tone} title={title}>
      {level === "none" ? label : `${label} · ${f.percent(value)}`}
    </Badge>
  );
}

export function ActorIcon({ type, className }: { type: "ai" | "user" | "system" | "integration"; className?: string }) {
  const base = "flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white";
  if (type === "ai")
    return (
      <span className={cn(base, "bg-violet-100 text-violet-700", className)}>
        <Bot className="size-3.5" />
      </span>
    );
  if (type === "user")
    return (
      <span className={cn(base, "bg-navy-100 text-navy-800", className)}>
        <UserCheck className="size-3.5" />
      </span>
    );
  if (type === "integration")
    return (
      <span className={cn(base, "bg-emerald-100 text-emerald-700", className)}>
        <Truck className="size-3.5" />
      </span>
    );
  return (
    <span className={cn(base, "bg-slate-100 text-slate-600", className)}>
      <CircleDot className="size-3.5" />
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .replace("Dr. ", "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full bg-navy-100 text-[11px] font-semibold text-navy-800", className)} aria-hidden>
      {initials}
    </span>
  );
}
