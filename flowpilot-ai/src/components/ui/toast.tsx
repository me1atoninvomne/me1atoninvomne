"use client";

import { CheckCircle2, OctagonAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/cn";

interface Toast {
  id: number;
  tone: "success" | "error" | "info";
  title: string;
  text?: string;
}

const ToastContext = createContext<{ push: (t: Omit<Toast, "id">) => void }>({ push: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), t.tone === "error" ? 7000 : 4000);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "fade-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg bg-white px-4 py-3 text-sm shadow-[var(--shadow-pop)] ring-1",
              t.tone === "error" ? "ring-red-200" : "ring-slate-200",
            )}
            role={t.tone === "error" ? "alert" : "status"}
          >
            {t.tone === "error" ? <OctagonAlert className="mt-0.5 size-4 shrink-0 text-red-600" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">{t.title}</p>
              {t.text && <p className="mt-0.5 text-slate-600">{t.text}</p>}
            </div>
            <button onClick={() => setToasts((l) => l.filter((x) => x.id !== t.id))} className="text-slate-400 hover:text-slate-600" aria-label="Schließen">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
