import type { Metadata } from "next";
import { ManageDataActions } from "@/components/legal/privacy-forms";
import { Section } from "@/components/marketing/section";
import { Callout } from "@/components/ui/feedback";
import { formatters } from "@/i18n/core";
import { legalDict } from "@/i18n/ui/legal";
import { getLang } from "@/server/auth/session";
import { exportLead } from "@/server/services/privacy";

export async function generateMetadata(): Promise<Metadata> {
  return { title: legalDict[await getLang()].manage.metaTitle, robots: { index: false, follow: false } };
}

/** Personal data page for a contact request, reachable only with its secret link. */
export default async function MyDataPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const lang = await getLang();
  const t = legalDict[lang].manage;
  const f = formatters(lang);
  const token = (await searchParams).t ?? "";
  const data = token ? await exportLead(token) : null;

  if (!data) {
    return (
      <Section level={1} title={t.title}>
        <Callout tone="warning" className="max-w-xl">
          {t.invalid}
        </Callout>
      </Section>
    );
  }

  const { lead, consents } = data;
  const rows: [string, string | null][] = [
    [t.fields.createdAt, f.dateTime(lead.createdAt)],
    [t.fields.name, lead.name],
    [t.fields.company, lead.company],
    [t.fields.email, lead.email],
    [t.fields.phone, lead.phone],
    [t.fields.employees, lead.employees],
    [t.fields.process, lead.process],
    [t.fields.message, lead.message],
    [t.fields.consentVersion, lead.consentVersion],
  ];
  // Latest decision per purpose.
  const current = new Map<string, boolean>();
  for (const c of consents) current.set(c.purpose, c.granted);

  return (
    <Section level={1} title={t.title} text={t.intro}>
      <div className="max-w-3xl space-y-8">
        <dl className="divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-1 px-5 py-3 sm:grid-cols-[220px_1fr]">
              <dt className="text-sm font-medium text-slate-700">{k}</dt>
              <dd className="text-sm break-words whitespace-pre-line text-slate-600">{v || "—"}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="consents-title">
          <h2 id="consents-title" className="text-base font-semibold text-slate-900">
            {t.consentsTitle}
          </h2>
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
            {[...current.entries()].map(([purpose, granted]) => (
              <li key={purpose} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="text-slate-700">{t.purpose[purpose as keyof typeof t.purpose] ?? purpose}</span>
                <span className={granted ? "font-medium text-emerald-700" : "text-slate-600"}>{granted ? t.granted : t.withdrawn}</span>
              </li>
            ))}
          </ul>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-medium text-slate-700">{t.consentHistory}</summary>
            <ol className="mt-2 space-y-2">
              {consents.map((c, i) => (
                <li key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-700 ring-1 ring-slate-200">
                  <span className="font-medium">{f.dateTime(c.createdAt)}</span> · {t.purpose[c.purpose as keyof typeof t.purpose] ?? c.purpose} ·{" "}
                  {c.granted ? t.granted : t.withdrawn} · v{c.version}
                  <span className="mt-1 block text-slate-600">„{c.text}“</span>
                </li>
              ))}
            </ol>
          </details>
        </section>

        <ManageDataActions token={token} marketingEmail={lead.marketingEmail} phoneCallback={lead.phoneCallback} />
      </div>
    </Section>
  );
}
