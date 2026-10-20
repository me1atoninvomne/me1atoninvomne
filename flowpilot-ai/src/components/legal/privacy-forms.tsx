"use client";

import { CheckCircle2, Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { fmt } from "@/i18n/core";
import { useFormat, useT } from "@/i18n/client";
import { legalDict } from "@/i18n/ui/legal";
import { apiFetch } from "@/lib/api-client";
import { Button } from "../ui/button";
import { Callout } from "../ui/feedback";
import { Input, Label, Select, Textarea } from "../ui/form";
import { Dialog } from "../ui/overlay";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------- Unsubscribe ---------- */

export function UnsubscribeForm({ token, maskedEmail }: { token: string | null; maskedEmail: string | null }) {
  const t = useT(legalDict).unsubscribe;
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "doneToken" | "doneEmail" | "failed">("idle");

  const viaToken = async () => {
    setState("busy");
    try {
      await apiFetch("/api/unsubscribe", { body: { token } });
      setState("doneToken");
    } catch {
      setState("failed");
    }
  };
  const viaEmail = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setError(t.invalidEmail);
      document.getElementById("unsubscribe-email")?.focus();
      return;
    }
    setState("busy");
    try {
      await apiFetch("/api/unsubscribe", { body: { email: email.trim() } });
      setState("doneEmail");
    } catch {
      setState("failed");
    }
  };

  if (state === "doneToken" || state === "doneEmail") {
    return <Callout tone="success">{state === "doneToken" ? t.done : t.doneEmail}</Callout>;
  }

  return (
    <div className="space-y-5">
      {state === "failed" && <Callout tone="danger">{t.error}</Callout>}
      {token && maskedEmail && (
        <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
          <p className="text-sm text-slate-700">{fmt(t.tokenText, { email: maskedEmail })}</p>
          <Button className="mt-3" variant="primary" loading={state === "busy"} onClick={viaToken}>
            {t.tokenButton}
          </Button>
        </div>
      )}
      {token && !maskedEmail && <Callout tone="warning">{t.invalidToken}</Callout>}
      <form onSubmit={viaEmail} noValidate className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <Label htmlFor="unsubscribe-email">{t.emailLabel}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="unsubscribe-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            invalid={!!error}
            aria-describedby={error ? "unsubscribe-email-error" : undefined}
          />
          <Button type="submit" loading={state === "busy"}>
            {t.emailButton}
          </Button>
        </div>
        {error && (
          <p id="unsubscribe-email-error" className="mt-1 text-xs text-red-700">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

/* ---------- Data-subject request ---------- */

const TYPES = ["access", "rectification", "erasure", "restriction", "portability", "objection", "withdraw"] as const;
type RequestType = (typeof TYPES)[number];

export function PrivacyRequestForm() {
  const t = useT(legalDict).request;
  const f = useFormat();
  const [v, setV] = useState({ type: "access" as RequestType, name: "", email: "", message: "", confirm: false, website: "" });
  const [errors, setErrors] = useState<Partial<Record<"name" | "email" | "confirm", string>>>({});
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");
  const [done, setDone] = useState<{ id: string; dueAt: string; type: RequestType } | null>(null);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: typeof errors = {};
    if (v.name.trim().length < 2) e.name = t.required;
    if (!EMAIL.test(v.email.trim())) e.email = t.invalidEmail;
    if (!v.confirm) e.confirm = t.confirmRequired;
    setErrors(e);
    if (Object.keys(e).length > 0) {
      document.getElementById(`dsr-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    setState("busy");
    try {
      const res = await apiFetch<{ id: string; dueAt: string }>("/api/privacy/requests", {
        body: { type: v.type, name: v.name.trim(), email: v.email.trim(), message: v.message.trim() || undefined, confirm: true, website: v.website },
      });
      setDone({ ...res, type: v.type });
    } catch {
      setState("failed");
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200" role="status">
        <CheckCircle2 className="size-8 text-emerald-600" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">{t.doneTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{fmt(t.doneText, { id: done.id, due: f.date(done.dueAt) })}</p>
        {done.type === "erasure" && <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.doneErasure}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:p-6">
      {state === "failed" && <Callout tone="danger">{t.error}</Callout>}
      <div>
        <Label htmlFor="dsr-type">{t.type}</Label>
        <Select id="dsr-type" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as RequestType })}>
          {TYPES.map((k) => (
            <option key={k} value={k}>
              {t.types[k]}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="dsr-name">{t.name}</Label>
          <Input
            id="dsr-name"
            autoComplete="name"
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
            invalid={!!errors.name}
            aria-describedby={errors.name ? "dsr-name-error" : undefined}
          />
          {errors.name && (
            <p id="dsr-name-error" className="mt-1 text-xs text-red-700">
              {errors.name}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="dsr-email">{t.email}</Label>
          <Input
            id="dsr-email"
            type="email"
            autoComplete="email"
            value={v.email}
            onChange={(e) => setV({ ...v, email: e.target.value })}
            invalid={!!errors.email}
            aria-describedby={errors.email ? "dsr-email-error" : undefined}
          />
          {errors.email && (
            <p id="dsr-email-error" className="mt-1 text-xs text-red-700">
              {errors.email}
            </p>
          )}
        </div>
      </div>
      <div>
        <Label htmlFor="dsr-message">{t.message}</Label>
        <Textarea id="dsr-message" rows={4} maxLength={2000} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} />
      </div>
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
        </label>
      </div>
      <div>
        <label htmlFor="dsr-confirm" className="flex items-start gap-2.5 text-sm leading-snug text-slate-700">
          <input
            id="dsr-confirm"
            type="checkbox"
            checked={v.confirm}
            onChange={(e) => setV({ ...v, confirm: e.target.checked })}
            aria-required
            aria-invalid={errors.confirm ? true : undefined}
            aria-describedby={errors.confirm ? "dsr-confirm-error" : undefined}
            className="mt-0.5 size-4 shrink-0 rounded border-slate-300 accent-navy-800"
          />
          <span>{t.confirm}</span>
        </label>
        {errors.confirm && (
          <p id="dsr-confirm-error" className="mt-1 pl-6.5 text-xs text-red-700">
            {errors.confirm}
          </p>
        )}
      </div>
      <div className="flex justify-end border-t border-slate-100 pt-4">
        <Button type="submit" variant="primary" loading={state === "busy"}>
          {state === "busy" ? t.sending : t.submit}
        </Button>
      </div>
    </form>
  );
}

/* ---------- Personal data page actions ---------- */

export function ManageDataActions({ token, marketingEmail, phoneCallback }: { token: string; marketingEmail: boolean; phoneCallback: boolean }) {
  const all = useT(legalDict);
  const t = all.manage;
  const [state, setState] = useState<"idle" | "busy" | "deleted" | "updated" | "failed">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const withdraw = async (purpose: "marketing_email" | "phone_callback") => {
    setState("busy");
    try {
      await apiFetch("/api/privacy/withdraw", { body: { token, purpose } });
      setState("updated");
      window.location.reload();
    } catch {
      setState("failed");
    }
  };
  const remove = async () => {
    setState("busy");
    try {
      await apiFetch("/api/privacy/delete", { body: { token } });
      setConfirmDelete(false);
      setState("deleted");
    } catch {
      setState("failed");
    }
  };

  if (state === "deleted") return <Callout tone="success">{t.deleted}</Callout>;

  return (
    <div className="space-y-3">
      {state === "failed" && <Callout tone="danger">{all.unsubscribe.error}</Callout>}
      {state === "updated" && <Callout tone="success">{t.updated}</Callout>}
      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/privacy/export?t=${encodeURIComponent(token)}`}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3.5 text-sm font-medium text-slate-800 ring-1 ring-slate-300 ring-inset hover:bg-slate-50"
        >
          <Download className="size-4" aria-hidden /> {t.download}
        </a>
        {marketingEmail && (
          <Button onClick={() => withdraw("marketing_email")} disabled={state === "busy"}>
            {t.withdrawMarketing}
          </Button>
        )}
        {phoneCallback && (
          <Button onClick={() => withdraw("phone_callback")} disabled={state === "busy"}>
            {t.withdrawPhone}
          </Button>
        )}
        <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
          {t.delete}
        </Button>
      </div>
      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t.delete}
        description={t.deleteConfirm}
        size="sm"
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>{t.cancel}</Button>
            <Button variant="danger" loading={state === "busy"} onClick={remove} icon={<Trash2 className="size-4" />}>
              {t.confirmDelete}
            </Button>
          </>
        }
      />
    </div>
  );
}
