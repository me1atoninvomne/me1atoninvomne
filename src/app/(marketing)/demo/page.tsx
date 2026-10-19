import { ArrowRight, Check, Info } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Section } from "@/components/marketing/section";
import { ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/feedback";
import { DEFAULT_INDUSTRY, INDUSTRY_KEYS, INDUSTRY_TEMPLATES, type IndustryKey } from "@/domain/templates";
import { marketingPagesDict } from "@/i18n/ui/marketing-pages";
import { getLang, WS_COOKIE } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: marketingPagesDict[await getLang()].demo.metaTitle };
}

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ expired?: string; industry?: string }> }) {
  const lang = await getLang();
  const t = marketingPagesDict[lang].demo;
  const sp = await searchParams;
  const hasDemo = Boolean((await cookies()).get(WS_COOKIE)?.value) && sp.expired !== "1";
  const preselected: IndustryKey = INDUSTRY_KEYS.includes(sp.industry as IndustryKey) ? (sp.industry as IndustryKey) : DEFAULT_INDUSTRY;

  return (
    <Section level={1} eyebrow={t.eyebrow} title={t.title} text={t.text}>
      {sp.expired === "1" && (
        <Callout tone="info" className="mb-6 max-w-3xl">
          {t.expired}
        </Callout>
      )}
      {hasDemo && (
        <Callout
          tone="neutral"
          className="mb-6 max-w-3xl"
          title={t.running}
          action={
            <ButtonLink href="/app" variant="primary" size="sm">
              {t.runningCta} <ArrowRight className="size-4" />
            </ButtonLink>
          }
        >
          {t.orNew}
        </Callout>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <aside className="order-2 space-y-6 lg:order-1">
          <ol className="space-y-3">
            {t.steps.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">{i + 1}</span>
                <span className="pt-0.5 text-[15px] text-slate-700">{s}</span>
              </li>
            ))}
          </ol>
          <ul className="space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            {t.facts.map((fact) => (
              <li key={fact.title} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span className="text-sm">
                  <span className="font-semibold text-slate-900">{fact.title}.</span> <span className="text-slate-600">{fact.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <form action="/api/demo/start" method="post" className="order-1 rounded-2xl lg:order-2 bg-white p-5 ring-1 ring-slate-200 sm:p-6">
          <fieldset>
            <legend className="text-base font-semibold text-slate-900">{t.choose}</legend>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500">
              <Info className="mt-0.5 size-4 shrink-0 text-slate-400" />
              {t.chooseHint}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {INDUSTRY_KEYS.map((k) => {
                const tpl = INDUSTRY_TEMPLATES[k];
                return (
                  <label
                    key={k}
                    className="group relative flex cursor-pointer flex-col rounded-xl p-4 ring-1 ring-slate-200 transition-shadow hover:ring-slate-300 has-[:checked]:bg-navy-50/50 has-[:checked]:ring-2 has-[:checked]:ring-navy-800 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-600"
                  >
                    <input type="radio" name="industry" value={k} defaultChecked={k === preselected} className="sr-only" />
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[15px] font-semibold text-slate-900">{tpl.name[lang]}</span>
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ring-slate-300 group-has-[:checked]:bg-navy-900 group-has-[:checked]:ring-navy-900">
                        <Check className="size-3 text-white opacity-0 group-has-[:checked]:opacity-100" />
                      </span>
                    </span>
                    <span className="mt-0.5 text-[13px] text-slate-500">{tpl.audience[lang]}</span>
                    <span className="mt-2.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">{t.processLabel}</span>
                    <span className="mt-1 text-[13px] leading-snug text-slate-600">{tpl.process.slice(0, 3).map((p) => p[lang]).join(" · ")}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">{marketingPagesDict[lang].demo.facts[2].text}</p>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-navy-900 px-5 text-[15px] font-medium text-white shadow-sm transition-colors hover:bg-navy-800 active:bg-navy-950"
            >
              {t.start} <ArrowRight className="size-4" />
            </button>
          </div>
        </form>
      </div>
    </Section>
  );
}
