"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/i18n/client";
import { errorDict } from "@/i18n/ui/common";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly params: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

export async function apiFetch<T = unknown>(url: string, init?: { method?: string; body?: unknown; form?: FormData }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? (init?.body || init?.form ? "POST" : "GET"),
      headers: init?.form ? undefined : { "Content-Type": "application/json" },
      body: init?.form ?? (init?.body !== undefined ? JSON.stringify(init.body) : undefined),
    });
  } catch {
    throw new ApiError("network", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.error?.code ?? "internal", res.status, data?.error?.params ?? {});
  return data as T;
}

/**
 * Mutation helper: calls the API, shows localized errors as toast, refreshes server components
 * on success. `pending` covers both the request and the subsequent refresh.
 */
export function useMutation() {
  const router = useRouter();
  const { push } = useToast();
  const e = useT(errorDict);
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();

  const errorMessage = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError) return err.code === "network" ? e.network : e.codes[err.code] ?? e.generic;
      return e.generic;
    },
    [e],
  );

  const run = useCallback(
    async <T,>(url: string, init?: { method?: string; body?: unknown; form?: FormData }, opts?: { success?: string; refresh?: boolean; silent?: boolean }) => {
      setBusy(true);
      try {
        const result = await apiFetch<T>(url, init);
        if (opts?.success) push({ tone: "success", title: opts.success });
        if (opts?.refresh !== false) startTransition(() => router.refresh());
        return result;
      } catch (err) {
        if (err instanceof ApiError && err.code === "no_session") {
          router.push("/demo?expired=1");
        }
        if (!opts?.silent) push({ tone: "error", title: errorMessage(err) });
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [push, router, errorMessage],
  );

  return { run, pending: busy || refreshing, errorMessage };
}
