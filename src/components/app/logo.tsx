import { cn } from "@/lib/cn";

/** FlowPilot mark: two converging flow lines into one path. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#172a47" />
      <path d="M8 10.5h7.5c3.6 0 6.5 2.9 6.5 6.5v0" stroke="#8eabd3" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M8 21.5h7.5c3.6 0 6.5-2.9 6.5-6.5" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="24.5" cy="16" r="2.2" fill="#ffffff" />
    </svg>
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className={cn("text-[15px] font-semibold tracking-tight", inverted ? "text-white" : "text-slate-900")}>
        FlowPilot <span className={inverted ? "text-navy-300" : "text-navy-500"}>AI</span>
      </span>
    </span>
  );
}
