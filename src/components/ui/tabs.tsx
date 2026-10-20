"use client";

import { Tabs as RTabs } from "radix-ui";
import { useT } from "@/i18n/client";
import { commonDict } from "@/i18n/ui/common";
import { cn } from "@/lib/cn";

export const Tabs = RTabs.Root;
export const TabsContent = RTabs.Content;

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <RTabs.List className={cn("flex gap-1 overflow-x-auto border-b border-slate-200", className)}>{children}</RTabs.List>;
}

export function TabsTrigger({ value, children, count }: { value: string; children: React.ReactNode; count?: number }) {
  return (
    <RTabs.Trigger
      value={value}
      className="-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 data-[state=active]:border-navy-800 data-[state=active]:text-slate-900"
    >
      {children}
      {count != null && <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{count}</span>}
    </RTabs.Trigger>
  );
}

/**
 * Segmented control for filters and view switches: a group of toggle buttons (aria-pressed),
 * reachable with Tab and operable with Enter/Space.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "sm",
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; count?: number }[];
  className?: string;
  size?: "sm" | "xs";
  /** Accessible name of the group, e.g. "Filter" or "Ansicht". */
  label?: string;
}) {
  const c = useT(commonDict);
  return (
    <div className={cn("inline-flex max-w-full overflow-x-auto rounded-lg bg-slate-100 p-0.5", className)} role="group" aria-label={label ?? c.filterGroup}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors",
            size === "sm" ? "px-2.5 py-1 text-[13px]" : "px-2 py-0.5 text-xs",
            value === o.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
          )}
        >
          {o.label}
          {o.count != null && <span className="tabular text-xs text-slate-500">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
