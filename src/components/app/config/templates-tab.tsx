"use client";

import { Check, Factory, Package, ShoppingCart, Truck, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { INDUSTRY_KEYS, INDUSTRY_TEMPLATES, type IndustryKey } from "@/domain/templates";
import { fmt } from "@/i18n/core";
import { useLang, useT } from "@/i18n/client";
import { commonDict } from "@/i18n/ui/common";
import { workflowsDict } from "@/i18n/ui/config";
import { useMutation } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Callout } from "../../ui/feedback";
import { Dialog } from "../../ui/overlay";

export const INDUSTRY_ICON: Record<IndustryKey, React.ComponentType<{ className?: string }>> = {
  manufacturing: Factory,
  wholesale: Package,
  logistics: Truck,
  purchasing: ShoppingCart,
  order_processing: ClipboardList,
};

export function TemplatesTab({ industry, isDemo }: { industry: string; isDemo: boolean }) {
  const t = useT(workflowsDict);
  const c = useT(commonDict);
  const lang = useLang();
  const router = useRouter();
  const { run, pending } = useMutation();
  const [confirm, setConfirm] = useState<IndustryKey | null>(null);

  const load = async () => {
    if (!confirm) return;
    try {
      await run("/api/demo/reset", { body: { industry: confirm } }, { success: t.templates.loaded });
      setConfirm(null);
      router.push("/app/inbox?tour=1");
    } catch {
      /* toast shown */
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{t.templates.title}</h2>
        <p className="mt-0.5 text-[13px] text-slate-500">{t.templates.subtitle}</p>
      </div>
      {!isDemo && <Callout tone="neutral">{t.templates.notDemo}</Callout>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INDUSTRY_KEYS.map((key) => {
          const tpl = INDUSTRY_TEMPLATES[key];
          const Icon = INDUSTRY_ICON[key];
          const current = key === industry;
          return (
            <Card key={key} className={cn("flex flex-col", current && "ring-2 ring-navy-600")} as="article">
              <div className="flex items-start gap-3 px-4 pt-4 sm:px-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 ring-1 ring-navy-100">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{tpl.name[lang]}</h3>
                    {current && (
                      <Badge tone="navy" icon={<Check className="size-3" />}>
                        {t.templates.current}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{tpl.audience[lang]}</p>
                </div>
              </div>
              <p className="px-4 pt-3 text-[13px] font-medium text-slate-800 sm:px-5">{tpl.focus[lang]}</p>
              <div className="flex-1 px-4 pt-3 sm:px-5">
                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{t.templates.process}</p>
                <ol className="mt-1.5 space-y-1">
                  {tpl.process.map((p, i) => (
                    <li key={p.de} className="flex gap-2 text-[13px] leading-snug text-slate-700">
                      <span className="tabular mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">{i + 1}</span>
                      {p[lang]}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
                <span className="text-xs text-slate-500">
                  {fmt(t.templates.workflows, { n: tpl.workflows.length })} · {fmt(t.templates.rules, { n: tpl.rules.length })}
                </span>
                <Button size="xs" variant={current ? "secondary" : "primary"} onClick={() => setConfirm(key)} disabled={!isDemo || pending}>
                  {t.templates.load}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      <Dialog
        open={confirm != null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm ? fmt(t.templates.confirmTitle, { name: INDUSTRY_TEMPLATES[confirm].name[lang] }) : ""}
        description={t.templates.confirmText}
        size="sm"
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>{c.cancel}</Button>
            <Button variant="primary" loading={pending} onClick={load}>
              {t.templates.load}
            </Button>
          </>
        }
      />
    </div>
  );
}
