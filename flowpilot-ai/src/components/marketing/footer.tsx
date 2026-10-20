import Link from "next/link";
import type { Lang } from "@/i18n/core";
import { legalDict } from "@/i18n/ui/legal";
import { marketingDict } from "@/i18n/ui/marketing";
import { CookieSettingsButton } from "../consent/cookie-settings-button";
import { Logo } from "../app/logo";

export function MarketingFooter({ lang }: { lang: Lang }) {
  const t = marketingDict[lang];
  const l = legalDict[lang].footer;
  const col = (title: string, links: { href: string; label: string }[], extra?: React.ReactNode) => (
    <nav aria-label={title}>
      <p className="text-xs font-semibold tracking-wider text-slate-600 uppercase">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-slate-600 hover:text-slate-900">
              {l.label}
            </Link>
          </li>
        ))}
        {extra && <li>{extra}</li>}
      </ul>
    </nav>
  );
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">{t.footer.tagline}</p>
          </div>
          {col(t.footer.product, [
            { href: "/#funktionen", label: t.nav.features },
            { href: "/#ablauf", label: t.nav.how },
            { href: "/preise", label: t.nav.pricing },
            { href: "/roi-rechner", label: t.nav.roi },
            { href: "/demo", label: t.cta.demo },
          ])}
          {col(t.footer.company, [
            { href: "/#branchen", label: t.nav.industries },
            { href: "/#sicherheit", label: t.nav.security },
            { href: "/kontakt", label: t.footer.contact },
          ])}
          {col(
            t.footer.legal,
            [
              { href: "/impressum", label: t.footer.imprint },
              { href: "/datenschutz", label: t.footer.privacy },
              { href: "/agb", label: l.terms },
              { href: "/erstattung", label: l.refund },
              { href: "/cookies", label: l.cookies },
              { href: "/datenschutz/anfrage", label: l.privacyRequest },
              { href: "/abmelden", label: l.unsubscribe },
              { href: "/lizenzen", label: l.licenses },
              { href: "/barrierefreiheit", label: l.accessibility },
            ],
            <CookieSettingsButton className="text-left text-sm text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline" />,
          )}
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-slate-100 pt-6 text-xs text-slate-500 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-2xl leading-relaxed">{t.footer.demoNote}</p>
          <p className="shrink-0">© {new Date().getFullYear()} {t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
