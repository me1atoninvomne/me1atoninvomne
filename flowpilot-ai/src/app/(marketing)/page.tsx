import {
  ArrowRight,
  BarChart3,
  Check,
  CircleDashed,
  ClipboardCheck,
  FileSearch,
  History,
  Inbox,
  Minus,
  Radar,
  ShieldCheck,
  UserCheck,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import { Faq } from "@/components/marketing/faq";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { SampleDemo } from "@/components/marketing/sample-demo";
import { Section } from "@/components/marketing/section";
import { ButtonLink } from "@/components/ui/button";
import { INDUSTRY_KEYS, INDUSTRY_TEMPLATES } from "@/domain/templates";
import { marketingDict } from "@/i18n/ui/marketing";
import { getLang } from "@/server/auth/session";

const FEATURE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  inbox: Inbox,
  doc: FileSearch,
  validation: ShieldCheck,
  hitl: UserCheck,
  workflow: Workflow,
  roi: BarChart3,
  radar: Radar,
  timeline: History,
};

export default async function LandingPage() {
  const lang = await getLang();
  const t = marketingDict[lang];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center lg:pt-20 lg:pb-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-800 ring-1 ring-navy-100">{t.hero.eyebrow}</p>
            <h1 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-balance text-slate-900 sm:text-5xl">{t.hero.title}</h1>
            <p className="mt-5 text-lg leading-relaxed font-medium text-pretty text-navy-800">{t.hero.promise}</p>
            <p className="mt-3 text-base leading-relaxed text-pretty text-slate-600">{t.hero.sub}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/demo" variant="primary" size="lg">
                {t.cta.demo} <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/roi-rechner" variant="secondary" size="lg">
                {t.cta.roi}
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-slate-500">{t.hero.note}</p>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* Problem */}
      <Section eyebrow={t.problem.eyebrow} title={t.problem.title} text={t.problem.text}>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {t.problem.chain.map((c, i) => (
            <li key={c.title} className="relative rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex items-center gap-2">
                <span className="tabular flex size-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{i + 1}</span>
                <p className="text-sm font-semibold text-slate-900">{c.title}</p>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{c.text}</p>
              {i < t.problem.chain.length - 1 && (
                <ArrowRight className="absolute top-1/2 -right-2.5 hidden size-4 -translate-y-1/2 text-slate-300 lg:block" aria-hidden />
              )}
            </li>
          ))}
        </ol>

        <div className="mt-12">
          <h3 className="text-lg font-semibold text-slate-900">{t.beforeAfter.title}</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">{t.beforeAfter.before}</p>
              <ul className="mt-3 space-y-2.5">
                {t.beforeAfter.beforeItems.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-[15px] text-slate-700">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100">
                      <X className="size-3" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-navy-950 p-5 text-white ring-1 ring-navy-900">
              <p className="text-xs font-bold tracking-widest text-navy-300 uppercase">{t.beforeAfter.after}</p>
              <ul className="mt-3 space-y-2.5">
                {t.beforeAfter.afterItems.map((a) => (
                  <li key={a} className="flex items-start gap-2.5 text-[15px] text-navy-50">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
                      <Check className="size-3" />
                    </span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Live sample */}
      <Section id="beispiel" tone="muted" eyebrow={t.sample.eyebrow} title={t.sample.title} text={t.sample.text}>
        <SampleDemo />
      </Section>

      {/* How it works */}
      <Section id="ablauf" eyebrow={t.how.eyebrow} title={t.how.title}>
        <ol className="grid gap-4 md:grid-cols-5">
          {t.how.steps.map((s, i) => (
            <li key={s.title} className="rounded-xl p-1">
              <div className="flex items-center gap-3 md:flex-col md:items-start">
                <span className="tabular flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-sm font-semibold text-white">{i + 1}</span>
                <div className="hidden h-px flex-1 bg-slate-200 md:block md:w-full" aria-hidden />
              </div>
              <p className="mt-3 text-[15px] font-semibold text-slate-900">{s.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Features */}
      <Section id="funktionen" tone="muted" eyebrow={t.features.eyebrow} title={t.features.title}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.features.items.map((item) => {
            const Icon = FEATURE_ICON[item.key] ?? CircleDashed;
            return (
              <div key={item.key} className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
                <span className="flex size-9 items-center justify-center rounded-lg bg-navy-50 text-navy-800 ring-1 ring-navy-100">
                  <Icon className="size-4" />
                </span>
                <p className="mt-4 text-[15px] font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.text}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Industries */}
      <Section id="branchen" eyebrow={t.industries.eyebrow} title={t.industries.title} text={t.industries.text}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {INDUSTRY_KEYS.map((k) => {
            const tpl = INDUSTRY_TEMPLATES[k];
            return (
              <article key={k} className="flex flex-col rounded-xl bg-white p-5 ring-1 ring-slate-200">
                <p className="text-base font-semibold text-slate-900">{tpl.name[lang]}</p>
                <p className="mt-0.5 text-[13px] text-slate-500">{tpl.audience[lang]}</p>
                <p className="mt-3 text-sm font-medium text-navy-800">{tpl.focus[lang]}</p>
                <ol className="mt-3 flex-1 space-y-1.5">
                  {tpl.process.map((p, i) => (
                    <li key={p.de} className="flex gap-2 text-[13px] leading-snug text-slate-600">
                      <span className="tabular mt-px w-4 shrink-0 text-xs font-semibold text-slate-400">{i + 1}.</span>
                      {p[lang]}
                    </li>
                  ))}
                </ol>
                <Link href={`/demo?industry=${k}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-navy-700 hover:text-navy-900">
                  {t.industries.try} <ArrowRight className="size-3.5" />
                </Link>
              </article>
            );
          })}
        </div>
      </Section>

      {/* Security */}
      <Section id="sicherheit" tone="muted" eyebrow={t.security.eyebrow} title={t.security.title} text={t.security.text}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <ClipboardCheck className="size-4 text-emerald-600" /> {t.security.doneTitle}
            </p>
            <ul className="mt-3 space-y-2">
              {t.security.done.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <CircleDashed className="size-4 text-slate-400" /> {t.security.plannedTitle}
            </p>
            <ul className="mt-3 space-y-2">
              {t.security.planned.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Minus className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-500">{t.security.note}</p>
      </Section>

      {/* Pilot */}
      <Section id="pilot" eyebrow={t.pilot.eyebrow} title={t.pilot.title} text={t.pilot.text}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ol className="grid gap-3 sm:grid-cols-2">
            {t.pilot.items.map((item, i) => (
              <li key={item.title} className="flex gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-navy-800 ring-1 ring-slate-200">{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-[13px] text-slate-600">{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-col justify-between rounded-xl bg-navy-950 p-6 text-white">
            <div>
              <p className="text-sm text-navy-200">{t.pilot.priceLabel}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight whitespace-nowrap">{t.pilot.price}</p>
              <p className="text-xs text-navy-300">{t.pilot.priceVat}</p>
              <p className="mt-2 text-sm text-navy-200">{t.pilot.priceNote}</p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <ButtonLink href="/kontakt" variant="secondary">
                {t.cta.consult}
              </ButtonLink>
              <Link href="/preise" className="text-center text-sm font-medium text-navy-200 hover:text-white">
                {t.cta.pricing} →
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" tone="muted" eyebrow={t.faq.eyebrow} title={t.faq.title}>
        <div className="max-w-3xl">
          <Faq items={t.faq.items} />
        </div>
      </Section>

      {/* Final CTA */}
      <Section tone="navy">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{t.finalCta.title}</h2>
            <p className="mt-3 text-base leading-relaxed text-navy-200">{t.finalCta.text}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <ButtonLink href="/kontakt" variant="secondary" size="lg">
              {t.cta.consult}
            </ButtonLink>
            <Link
              href="/demo"
              className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-[15px] font-medium text-white ring-1 ring-white/25 ring-inset transition-colors hover:bg-white/10"
            >
              {t.cta.demo}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
