"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { fmt } from "@/i18n/core";
import { useT } from "@/i18n/client";
import { legalDict } from "@/i18n/ui/legal";
import { apiFetch } from "@/lib/api-client";
import { Button } from "../ui/button";
import { Dialog } from "../ui/overlay";

/** Self-service erasure of the visitor's demo workspace (settings page). */
export function DeleteDemoData({ ttlHours }: { ttlHours: number }) {
  const t = useT(legalDict).deleteDemo;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await apiFetch("/api/demo/delete", { body: {} });
      window.location.assign("/demo?deleted=1");
    } catch {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-3 rounded-lg p-4 ring-1 ring-red-200 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-900">{t.sectionTitle}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{fmt(t.sectionText, { hours: ttlHours })}</p>
      </div>
      <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setOpen(true)}>
        {t.action}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t.title}
        description={t.text}
        size="sm"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button variant="danger" loading={busy} onClick={run} icon={<Trash2 className="size-4" />}>
              {t.confirm}
            </Button>
          </>
        }
      />
    </div>
  );
}
