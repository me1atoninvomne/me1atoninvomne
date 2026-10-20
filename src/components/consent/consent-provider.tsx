"use client";

import { Cookie } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useLang, useT } from "@/i18n/client";
import { legalDict } from "@/i18n/ui/legal";
import { setComfortAllowed } from "@/lib/comfort-storage";
import { STORAGE_INVENTORY, type ConsentState } from "@/legal/cookies";
import { Button } from "../ui/button";
import { Dialog } from "../ui/overlay";
import { useToast } from "../ui/toast";

interface ConsentApi {
  consent: ConsentState | null;
  comfort: boolean;
  openSettings: () => void;
}

const ConsentContext = createContext<ConsentApi>({ consent: null, comfort: false, openSettings: () => {} });

export const useConsent = () => useContext(ConsentContext);

/**
 * Holds the visitor's cookie choice, renders the banner while no valid choice exists and the
 * settings dialog on demand. "Necessary only" and "Accept all" are deliberately equal in size,
 * colour and position; nothing optional is pre-selected and the page stays usable without a choice.
 */
export function ConsentProvider({ initial, children }: { initial: ConsentState | null; children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentState | null>(initial);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const comfort = consent?.comfort === true;
  // Must be set before children read storage in their effects (child effects run first).
  if (typeof window !== "undefined") setComfortAllowed(comfort);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const api = useMemo(() => ({ consent, comfort, openSettings }), [consent, comfort, openSettings]);

  return (
    <ConsentContext.Provider value={api}>
      {children}
      {!consent && <CookieBanner onSaved={setConsent} onSettings={openSettings} />}
      <CookieSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} current={consent} onSaved={setConsent} />
    </ConsentContext.Provider>
  );
}

async function saveConsent(comfort: boolean): Promise<ConsentState> {
  const res = await fetch("/api/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comfort }) });
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as { consent: ConsentState };
  return data.consent;
}

function CookieBanner({ onSaved, onSettings }: { onSaved: (c: ConsentState) => void; onSettings: () => void }) {
  const t = useT(legalDict).banner;
  const { push } = useToast();
  const [busy, setBusy] = useState<null | "necessary" | "all">(null);

  const choose = async (comfort: boolean) => {
    setBusy(comfort ? "all" : "necessary");
    try {
      onSaved(await saveConsent(comfort));
    } catch {
      push({ tone: "error", title: t.error });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      role="region"
      aria-label={t.title}
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-md sm:rounded-xl sm:border sm:ring-1 sm:ring-slate-200"
    >
      <div className="p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Cookie className="size-4 text-slate-600" aria-hidden />
          {t.title}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
          {t.text}{" "}
          <Link href="/cookies" className="font-medium text-navy-700 underline underline-offset-2 hover:text-navy-900">
            {t.policy}
          </Link>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={() => choose(false)} loading={busy === "necessary"} disabled={busy !== null} className="w-full">
            {t.necessaryOnly}
          </Button>
          <Button onClick={() => choose(true)} loading={busy === "all"} disabled={busy !== null} className="w-full">
            {t.acceptAll}
          </Button>
        </div>
        <button onClick={onSettings} className="mt-2 w-full rounded-md py-1.5 text-center text-[13px] font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900">
          {t.settings}
        </button>
      </div>
    </section>
  );
}

function CookieSettingsDialog({
  open,
  onOpenChange,
  current,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  current: ConsentState | null;
  onSaved: (c: ConsentState) => void;
}) {
  const t = useT(legalDict).banner;
  const lang = useLang();
  const { push } = useToast();
  const [comfort, setComfort] = useState(current?.comfort ?? false);
  const [busy, setBusy] = useState(false);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setComfort(current?.comfort ?? false);
  }

  const save = async () => {
    setBusy(true);
    try {
      onSaved(await saveConsent(comfort));
      push({ tone: "success", title: t.saved });
      onOpenChange(false);
    } catch {
      push({ tone: "error", title: t.error });
    } finally {
      setBusy(false);
    }
  };

  const entries = (category: "necessary" | "comfort") => (
    <details className="mt-2 text-xs text-slate-600">
      <summary className="cursor-pointer font-medium text-slate-700">{t.entries}</summary>
      <ul className="mt-1.5 space-y-1">
        {STORAGE_INVENTORY.filter((e) => e.category === category).map((e) => (
          <li key={e.name}>
            <code className="font-mono text-[11px] text-slate-800">{e.name}</code> · {e.storage} · {e.duration[lang]}
          </li>
        ))}
      </ul>
    </details>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.dialogTitle}
      description={t.dialogText}
      footer={
        <Button variant="primary" onClick={save} loading={busy}>
          {t.save}
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="rounded-lg p-3 ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">{t.necessaryTitle}</p>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{t.alwaysOn}</span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{t.necessaryText}</p>
          {entries("necessary")}
        </div>
        <div className="rounded-lg p-3 ring-1 ring-slate-200">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-900">{t.comfortTitle}</span>
            <input type="checkbox" role="switch" checked={comfort} onChange={(e) => setComfort(e.target.checked)} className="size-4 accent-navy-800" aria-describedby="consent-comfort-text" />
          </label>
          <p id="consent-comfort-text" className="mt-1 text-[13px] leading-relaxed text-slate-600">
            {t.comfortText}
          </p>
          {entries("comfort")}
        </div>
      </div>
    </Dialog>
  );
}

/** Reopens the cookie settings (footer, cookie policy, app user menu). */
export function CookieSettingsButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { openSettings } = useConsent();
  const t = useT(legalDict).footer;
  return (
    <button type="button" onClick={openSettings} className={className}>
      {children ?? t.cookieSettings}
    </button>
  );
}
