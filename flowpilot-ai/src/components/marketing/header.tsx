"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useLang, useT } from "@/i18n/client";
import { marketingDict } from "@/i18n/ui/marketing";
import { cn } from "@/lib/cn";
import { Logo } from "../app/logo";
import { ButtonLink } from "../ui/button";

export function MarketingHeader({ hasDemo }: { hasDemo: boolean }) {
  const t = useT(marketingDict);
  const lang = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  // Mobile menu: move focus into the menu when it opens, close with Escape and return focus.
  useEffect(() => {
    if (!open) return;
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const links = [
    { href: "/#funktionen", label: t.nav.features },
    { href: "/#ablauf", label: t.nav.how },
    { href: "/#branchen", label: t.nav.industries },
    { href: "/#sicherheit", label: t.nav.security },
    { href: "/preise", label: t.nav.pricing },
    { href: "/roi-rechner", label: t.nav.roi },
  ];

  async function setLang(l: "de" | "en") {
    if (l === lang) return;
    await fetch("/api/session/lang", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: l }) }).catch(() => null);
    startTransition(() => router.refresh());
  }

  const langSwitch = (
    <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 text-xs font-semibold" role="group" aria-label={t.nav.language}>
      {(["de", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn("rounded-md px-2 py-1", lang === l ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label={t.nav.home} className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label={t.nav.main}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900",
                pathname === l.href && "text-slate-900",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <div className="hidden sm:block">{langSwitch}</div>
          {hasDemo && (
            <ButtonLink href="/app" size="sm" variant="secondary" className="hidden md:inline-flex">
              {t.cta.runningDemo}
            </ButtonLink>
          )}
          <ButtonLink href="/demo" size="sm" variant="primary" className="hidden sm:inline-flex">
            {t.cta.demo}
          </ButtonLink>
          <button
            ref={toggleRef}
            type="button"
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t.nav.close : t.nav.menu}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div id="mobile-nav" ref={drawerRef} className="fade-in border-t border-slate-100 bg-white px-4 pt-2 pb-4 lg:hidden">
          <nav className="flex flex-col" aria-label={t.nav.mobile}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-md px-2 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-50" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            <Link href="/kontakt" className="rounded-md px-2 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-50" onClick={() => setOpen(false)}>
              {t.nav.contact}
            </Link>
          </nav>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            {langSwitch}
            <div className="flex gap-2">
              {hasDemo && (
                <ButtonLink href="/app" size="sm">
                  {t.cta.runningDemo}
                </ButtonLink>
              )}
              <ButtonLink href="/demo" size="sm" variant="primary">
                {t.cta.demo}
              </ButtonLink>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
