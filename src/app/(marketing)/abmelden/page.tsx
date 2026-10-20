import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/legal/privacy-forms";
import { Section } from "@/components/marketing/section";
import { Callout } from "@/components/ui/feedback";
import { legalDict } from "@/i18n/ui/legal";
import { getLang } from "@/server/auth/session";
import { unsubscribePreview } from "@/server/services/privacy";

export async function generateMetadata(): Promise<Metadata> {
  return { title: legalDict[await getLang()].unsubscribe.metaTitle };
}

/**
 * Unsubscribe page. Opening a link never unsubscribes by itself (mail scanners prefetch links);
 * the person confirms with one click. Works without a link via the e-mail address.
 */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const lang = await getLang();
  const t = legalDict[lang].unsubscribe;
  const token = (await searchParams).t ?? null;
  const preview = token ? await unsubscribePreview(token) : null;
  return (
    <Section level={1} title={t.title} text={t.text}>
      <div className="max-w-xl space-y-5">
        <Callout tone="info">{t.honest}</Callout>
        <UnsubscribeForm token={token} maskedEmail={preview?.email ?? null} />
      </div>
    </Section>
  );
}
