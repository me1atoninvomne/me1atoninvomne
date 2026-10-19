import { ArrowRight, Check, FlaskConical, Minus } from "lucide-react";
import type { Metadata } from "next";
import { Faq } from "@/components/marketing/faq";
import { Section } from "@/components/marketing/section";
import { ButtonLink } from "@/components/ui/button";
import { marketingPagesDict } from "@/i18n/ui/marketing-pages";
import { cn } from "@/lib/cn";
import { getLang } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: marketingPagesDict[await getLang()].pricing.metaTitle };
}

export default async function PricingPage() {
  const t = marketingPagesDict[await getLang()].pricing;
  return (
    <>
      <Section level={1} eyebrow={t.eyebrow} title={t.title} text={t.text}>
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-800 ring-1 ring-amber-200 ring-inset">{t.intro}</span>
          <span className="text-slate-500">{t.vat}</span>
          <span className="basis-full text-[13px] text-slate-500">{t.connectorNote}</span>
        </div>
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-4">
          {t.tiers.map((tier) => {
            const featured = tier.key === "business";
            return (
              <article
                key={tier.key}
                className={cn("relative flex flex-col rounded-2xl bg-white p-6 ring-1", featured ? "shadow-[var(--shadow-pop)] ring-2 ring-navy-800" : "ring-slate-200")}
              >
                {featured && (
                  <p className="absolute -top-3 left-6 rounded-full bg-navy-900 px-2.5 py-0.5 text-xs font-medium text-white">{t.recommended}</p>
                )}
                <h2 className="text-lg font-semibold text-slate-900">{tier.name}</h2>
                <p className="mt-1 text-sm text-slate-500 lg:min-h-10">{tier.tagline}</p>
                <p className="mt-5 flex items-baseline gap-1.5">
                  {tier.prefix && <span className="text-sm text-slate-500">{tier.prefix}</span>}
                  <span className="text-3xl font-semibold tracking-tight text-slate-900">{tier.price}</span>
                  <span className="text-sm text-slate-500">{t.perMonth}</span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {t.setup}: <span className="font-medium text-slate-800">{tier.setup}</span>
                </p>
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{t.included}</p>
                  <ul className="mt-2.5 space-y-2">
                    {tier.included.map((i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        {i}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-5 flex-1 border-t border-slate-100 pt-5">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{t.limits}</p>
                  <ul className="mt-2.5 space-y-2">
                    {tier.limits.map((i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <Minus className="mt-0.5 size-4 shrink-0 text-slate-400" />
                        {i}
                      </li>
                    ))}
                  </ul>
                </div>
                <ButtonLink href="/kontakt" variant={featured ? "primary" : "secondary"} className="mt-6">
                  {t.choose}
                </ButtonLink>
              </article>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <article className="flex flex-col gap-4 rounded-2xl bg-navy-950 p-6 text-white sm:flex-row">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-navy-100">
              <FlaskConical className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{t.pilot.title}</h2>
                <p className="text-base font-semibold text-navy-100">{t.pilot.price}</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-navy-200">{t.pilot.text}</p>
              <ul className="mt-3 space-y-1.5">
                {t.pilot.items.map((i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-navy-100">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          </article>
          <article className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-900">{t.individual.title}</h2>
            <ul className="mt-3 space-y-2">
              {t.individual.items.map((i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  {i}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </Section>

      <Section tone="muted" title="FAQ">
        <div className="max-w-3xl">
          <Faq items={t.faq} />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/kontakt" variant="primary">
              {t.choose}
            </ButtonLink>
            <ButtonLink href="/demo">{t.tryDemo}</ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
