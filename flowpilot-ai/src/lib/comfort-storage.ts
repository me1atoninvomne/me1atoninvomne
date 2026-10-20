/**
 * Browser storage for the optional "comfort" category. Without consent, values live in memory
 * only (lost on reload); with consent they go to localStorage/sessionStorage. Withdrawing consent
 * removes everything this app stored in that category.
 */
import { COMFORT_STORAGE_PREFIXES } from "@/legal/cookies";

const memory = { local: new Map<string, string>(), session: new Map<string, string>() };
let allowed = false;

function native(kind: "local" | "session"): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function setComfortAllowed(value: boolean) {
  if (value === allowed) return;
  allowed = value;
  if (!value) purgeComfortStorage();
}

export function purgeComfortStorage() {
  for (const kind of ["local", "session"] as const) {
    const s = native(kind);
    if (!s) continue;
    for (const key of Object.keys(s)) {
      if (COMFORT_STORAGE_PREFIXES.some((p) => key.startsWith(p))) s.removeItem(key);
    }
  }
}

export function comfortStorage(kind: "local" | "session") {
  return {
    getItem(key: string): string | null {
      const s = allowed ? native(kind) : null;
      return s ? s.getItem(key) : (memory[kind].get(key) ?? null);
    },
    setItem(key: string, value: string) {
      const s = allowed ? native(kind) : null;
      if (s) s.setItem(key, value);
      else memory[kind].set(key, value);
    },
    removeItem(key: string) {
      memory[kind].delete(key);
      if (allowed) native(kind)?.removeItem(key);
    },
  };
}
