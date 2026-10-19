import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/70", className)} aria-hidden />;
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  text?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">{icon}</div>}
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

type CalloutTone = "info" | "warning" | "danger" | "success" | "neutral";

const CALLOUT: Record<CalloutTone, { box: string; icon: React.ReactNode }> = {
  info: { box: "bg-sky-50 text-sky-900 ring-sky-200", icon: <Info className="size-4 text-sky-600" /> },
  warning: { box: "bg-amber-50 text-amber-900 ring-amber-200", icon: <AlertTriangle className="size-4 text-amber-600" /> },
  danger: { box: "bg-red-50 text-red-900 ring-red-200", icon: <OctagonAlert className="size-4 text-red-600" /> },
  success: { box: "bg-emerald-50 text-emerald-900 ring-emerald-200", icon: <CheckCircle2 className="size-4 text-emerald-600" /> },
  neutral: { box: "bg-slate-50 text-slate-800 ring-slate-200", icon: <Info className="size-4 text-slate-500" /> },
};

export function Callout({
  tone = "info",
  title,
  children,
  className,
  icon,
  action,
}: {
  tone?: CalloutTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const t = CALLOUT[tone];
  return (
    <div className={cn("flex gap-3 rounded-lg px-3.5 py-3 text-sm ring-1 ring-inset", t.box, className)} role={tone === "danger" ? "alert" : undefined}>
      <div className="mt-0.5 shrink-0">{icon ?? t.icon}</div>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "leading-relaxed opacity-90")}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, tone = "navy", className, label }: { value: number; tone?: "navy" | "emerald" | "amber" | "red" | "blue"; className?: string; label?: string }) {
  const color = { navy: "bg-navy-700", emerald: "bg-emerald-600", amber: "bg-amber-500", red: "bg-red-600", blue: "bg-blue-600" }[tone];
  const track = { navy: "bg-navy-100", emerald: "bg-emerald-100", amber: "bg-amber-100", red: "bg-red-100", blue: "bg-blue-100" }[tone];
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full", track, className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}
