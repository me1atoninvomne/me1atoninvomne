import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { Section } from "@/components/marketing/section";
import { RoiCalculator } from "@/components/roi/roi-calculator";
import { ButtonLink } from "@/components/ui/button";
import { marketingDict } from "@/i18n/ui/marketing";
import { marketingPagesDict } from "@/i18n/ui/marketing-pages";
import { getLang } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: marketingPagesDict[await getLang()].roi.metaTitle };
}

export default async function RoiPage() {
  const lang = await getLang();
  const t = marketingPagesDict[lang].roi;
  const m = marketingDict[lang];
  return (
    <Section level={1} eyebrow={t.eyebrow} title={t.title} text={t.text} tone="muted" className="border-t-0">
      <RoiCalculator />
      <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-white p-6 ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="text-base font-semibold text-slate-900">{t.next}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{t.nextText}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <ButtonLink href="/demo">{m.cta.demo}</ButtonLink>
          <ButtonLink href="/kontakt" variant="primary">
            {m.cta.consult} <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
