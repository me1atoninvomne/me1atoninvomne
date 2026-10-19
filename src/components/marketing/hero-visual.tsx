"use client";

import { AlertTriangle, Check, FileText, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { marketingDict } from "@/i18n/ui/marketing";
import { cn } from "@/lib/cn";

/** Product visual built from real UI elements; steps through the processing stages. */
export function HeroVisual() {
  const t = useT(marketingDict).visual;
  const [stage, setStage] = useState(3);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setStage(0);
    let s = 0;
    const id = setInterval(() => {
      s = (s + 1) % 6; // two extra ticks to hold the final state
      setStage(Math.min(s, 3));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const show = (n: number) => (stage >= n ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-1");

  return (
    <div className="relative" aria-label={t.label}>
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_-24px_rgba(14,27,48,0.35)] ring-1 ring-slate-200">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-slate-200" />
          <span className="size-2.5 rounded-full bg-slate-200" />
          <span className="size-2.5 rounded-full bg-slate-200" />
          <span className="ml-2 text-xs font-medium text-slate-500">FlowPilot AI · {t.inbox}</span>
          <span className="ml-auto hidden rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 sm:inline">{t.label}</span>
        </div>

        <ol className="flex gap-1 border-b border-slate-100 px-4 py-2.5" aria-hidden>
          {t.stages.map((s, i) => (
            <li
              key={s}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors duration-300",
                i < stage ? "bg-emerald-50 text-emerald-700" : i === stage ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-400",
              )}
            >
              {i < stage && <Check className="size-3" />}
              {s}
            </li>
          ))}
        </ol>

        <div className="space-y-3 p-4">
          <div className="flex items-start gap-3 rounded-lg px-1">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-100 text-navy-800">
              <Mail className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[13px] font-semibold text-slate-900">{t.from}</p>
                <span className="shrink-0 text-[11px] text-slate-400">{t.received}</span>
              </div>
              <p className="truncate text-[13px] text-slate-600">{t.subject}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
                <FileText className="size-3" /> {t.attachment}
              </p>
            </div>
          </div>

          <div className={cn("rounded-lg ring-1 ring-slate-200 transition-all duration-500", show(1))}>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-800">
                <Sparkles className="size-3.5 text-violet-600" /> {t.recognised}
              </span>
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200 ring-inset">{t.confidence}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-3 py-2.5">
              {t.fields.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[10px] tracking-wide text-slate-400 uppercase">{k}</dt>
                  <dd className="truncate text-[12px] font-medium text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className={cn("flex gap-2.5 rounded-lg bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200 transition-all duration-500", show(2))}>
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-amber-900">{t.findingTitle}</p>
              <p className="text-[12px] text-amber-800">{t.findingText}</p>
            </div>
          </div>

          <div className={cn("flex gap-2.5 rounded-lg bg-violet-50 px-3 py-2.5 ring-1 ring-violet-200 transition-all duration-500", show(3))}>
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-violet-700" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-violet-900">{t.decisionTitle}</p>
              <p className="text-[12px] text-violet-800">{t.decisionText}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
