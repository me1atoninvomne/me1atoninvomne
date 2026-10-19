import { cn } from "@/lib/cn";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "ai" | "navy" | "outline";

const TONE: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-red-50 text-red-800 ring-red-200",
  ai: "bg-violet-50 text-violet-800 ring-violet-200",
  navy: "bg-navy-900 text-white ring-navy-900",
  outline: "bg-white text-slate-700 ring-slate-300",
};

const DOT: Record<Tone, string> = {
  neutral: "bg-slate-400",
  info: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  ai: "bg-violet-500",
  navy: "bg-white",
  outline: "bg-slate-400",
};

export function Badge({
  tone = "neutral",
  dot,
  icon,
  className,
  children,
  title,
}: {
  tone?: Tone;
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn("inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", TONE[tone], className)}
    >
      {dot && <span className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} aria-hidden />}
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}
