"use client";

import { createContext, useContext, useMemo } from "react";
import { formatters, type Formatters, type Lang } from "./core";
import { dom, type DomainDict } from "./domain";

const LangContext = createContext<Lang>("de");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

/** Picks the current language from a `{ de, en }` dictionary. */
export function useT<T>(dict: { de: T; en: unknown }): T {
  const lang = useLang();
  return (dict as { de: T; en: T })[lang];
}

export function useFormat(): Formatters {
  const lang = useLang();
  return useMemo(() => formatters(lang), [lang]);
}

export function useDomain(): DomainDict {
  const lang = useLang();
  return useMemo(() => dom(lang), [lang]);
}
