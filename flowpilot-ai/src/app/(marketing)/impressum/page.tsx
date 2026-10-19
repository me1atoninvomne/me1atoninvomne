import type { Metadata } from "next";
import { Section } from "@/components/marketing/section";
import { Callout } from "@/components/ui/feedback";
import { marketingPagesDict } from "@/i18n/ui/marketing-pages";
import { getLang } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: marketingPagesDict[await getLang()].legal.imprintMeta };
}

export default async function ImprintPage() {
  const t = marketingPagesDict[await getLang()].legal;
  return (
    <Section level={1} title={t.imprintTitle}>
      <div className="max-w-2xl">
        <Callout tone="warning" className="mb-6">
          {t.placeholder}
        </Callout>
        <dl className="divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
          {t.imprintItems.map(([k, v]) => (
            <div key={k} className="grid gap-1 px-5 py-3 sm:grid-cols-[220px_1fr]">
              <dt className="text-sm font-medium text-slate-700">{k}</dt>
              <dd className="text-sm text-slate-500">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
