import { Check } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/contact-form";
import { Section } from "@/components/marketing/section";
import { marketingPagesDict } from "@/i18n/ui/marketing-pages";
import { getLang } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: marketingPagesDict[await getLang()].contact.metaTitle };
}

export default async function ContactPage() {
  const t = marketingPagesDict[await getLang()].contact;
  return (
    <Section level={1} eyebrow={t.eyebrow} title={t.title} text={t.text}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <aside>
          <p className="text-base font-semibold text-slate-900">{t.expect}</p>
          <ul className="mt-3 space-y-2.5">
            {t.expectItems.map((i) => (
              <li key={i} className="flex items-start gap-2.5 text-[15px] text-slate-700">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                {i}
              </li>
            ))}
          </ul>
        </aside>
        <ContactForm />
      </div>
    </Section>
  );
}
