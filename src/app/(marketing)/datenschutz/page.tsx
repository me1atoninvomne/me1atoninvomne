import type { Metadata } from "next";
import { Section } from "@/components/marketing/section";
import { Callout } from "@/components/ui/feedback";
import { marketingPagesDict } from "@/i18n/ui/marketing-pages";
import { getLang } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: marketingPagesDict[await getLang()].legal.privacyMeta };
}

export default async function PrivacyPage() {
  const t = marketingPagesDict[await getLang()].legal;
  return (
    <Section level={1} title={t.privacyTitle} text={t.privacyIntro}>
      <div className="max-w-2xl">
        <Callout tone="warning" className="mb-6">
          {t.placeholder}
        </Callout>
        <div className="space-y-6">
          {t.privacySections.map((s) => (
            <section key={s.title}>
              <h2 className="text-base font-semibold text-slate-900">{s.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.text}</p>
            </section>
          ))}
        </div>
      </div>
    </Section>
  );
}
