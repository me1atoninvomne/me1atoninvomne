import type { Metadata } from "next";
import { PrivacyRequestForm } from "@/components/legal/privacy-forms";
import { Section } from "@/components/marketing/section";
import { legalDict } from "@/i18n/ui/legal";
import { getLang } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: legalDict[await getLang()].request.metaTitle };
}

export default async function PrivacyRequestPage() {
  const t = legalDict[await getLang()].request;
  return (
    <Section level={1} title={t.title} text={t.text}>
      <div className="max-w-2xl space-y-5">
        <p className="text-sm leading-relaxed text-slate-600">{t.selfService}</p>
        <PrivacyRequestForm />
      </div>
    </Section>
  );
}
