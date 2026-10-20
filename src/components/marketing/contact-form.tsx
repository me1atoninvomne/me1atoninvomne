"use client";

import { Check, CheckCircle2, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { legalDict } from "@/i18n/ui/legal";
import { marketingPagesDict } from "@/i18n/ui/marketing-pages";
import { Button } from "../ui/button";
import { Callout } from "../ui/feedback";
import { Input, Label, Select, Textarea } from "../ui/form";

type Values = {
  name: string;
  company: string;
  email: string;
  phone: string;
  employees: string;
  process: string;
  message: string;
  /** Required: at least 18 and acting for a business. */
  b2b: boolean;
  /** Required: consent to process the request. */
  consent: boolean;
  /** Optional and never pre-selected. */
  marketingEmail: boolean;
  phoneCallback: boolean;
  website: string;
};
type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = {
  name: "",
  company: "",
  email: "",
  phone: "",
  employees: "",
  process: "",
  message: "",
  b2b: false,
  consent: false,
  marketingEmail: false,
  phoneCallback: false,
  website: "",
};

export function ContactForm() {
  const t = useT(marketingPagesDict).contact;
  const l = useT(legalDict);
  const [values, setValues] = useState<Values>(EMPTY);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function validate(): Errors {
    const e: Errors = {};
    if (values.name.trim().length < 2) e.name = t.required;
    if (values.company.trim().length < 2) e.company = t.required;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) e.email = t.invalidEmail;
    if (!values.b2b) e.b2b = l.consents.ageRequired;
    if (!values.consent) e.consent = l.consents.processingRequired;
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      document.getElementById(`contact-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          company: values.company.trim(),
          email: values.email.trim(),
          phone: values.phone.trim() || undefined,
          employees: values.employees || undefined,
          process: values.process || undefined,
          message: values.message.trim() || undefined,
          consents: {
            b2b: true,
            processing: true,
            marketingEmail: values.marketingEmail,
            phoneCallback: values.phoneCallback && values.phone.trim() !== "",
          },
          website: values.website,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { token?: string };
      setToken(data.token ?? null);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    const link = token ? `${window.location.origin}/datenschutz/meine-daten?t=${token}` : null;
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200" role="status">
        <CheckCircle2 className="size-8 text-emerald-600" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">{t.successTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.successText}</p>
        {link && (
          <div className="mt-5 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-900">{l.manage.linkTitle}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{l.manage.linkText}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link href={`/datenschutz/meine-daten?t=${token}`} className="min-w-0 flex-1 truncate font-mono text-xs text-navy-700 underline underline-offset-2">
                {link}
              </Link>
              <Button
                size="sm"
                icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                  } catch {
                    /* clipboard unavailable – the link stays visible */
                  }
                }}
              >
                {copied ? l.manage.copied : l.manage.copy}
              </Button>
            </div>
          </div>
        )}
        <Button
          className="mt-5"
          onClick={() => {
            setValues(EMPTY);
            setToken(null);
            setCopied(false);
            setStatus("idle");
          }}
        >
          {t.again}
        </Button>
      </div>
    );
  }

  const err = (k: keyof Values) =>
    errors[k] ? (
      <p id={`contact-${k}-error`} className="mt-1 text-xs text-red-600">
        {errors[k]}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:p-6">
      {status === "error" && <Callout tone="danger">{t.error}</Callout>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name">{t.name}</Label>
          <Input id="contact-name" autoComplete="name" value={values.name} onChange={(e) => set("name", e.target.value)} invalid={!!errors.name} aria-describedby={errors.name ? "contact-name-error" : undefined} />
          {err("name")}
        </div>
        <div>
          <Label htmlFor="contact-company">{t.company}</Label>
          <Input
            id="contact-company"
            autoComplete="organization"
            value={values.company}
            onChange={(e) => set("company", e.target.value)}
            invalid={!!errors.company}
            aria-describedby={errors.company ? "contact-company-error" : undefined}
          />
          {err("company")}
        </div>
        <div>
          <Label htmlFor="contact-email">{t.email}</Label>
          <Input
            id="contact-email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            invalid={!!errors.email}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
          />
          {err("email")}
        </div>
        <div>
          <Label htmlFor="contact-phone">{t.phone}</Label>
          <Input id="contact-phone" type="tel" autoComplete="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="contact-employees">{t.employees}</Label>
          <Select id="contact-employees" value={values.employees} onChange={(e) => set("employees", e.target.value)}>
            <option value="">{t.choose}</option>
            {t.employeesOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="contact-process">{t.process}</Label>
          <Select id="contact-process" value={values.process} onChange={(e) => set("process", e.target.value)}>
            <option value="">{t.choose}</option>
            {t.processOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="contact-message">{t.message}</Label>
        <Textarea id="contact-message" rows={4} value={values.message} onChange={(e) => set("message", e.target.value)} placeholder={t.messagePlaceholder} maxLength={2000} />
      </div>
      {/* Honeypot for bots – hidden from people and assistive technology */}
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set("website", e.target.value)} />
        </label>
      </div>
      <fieldset className="space-y-3 border-t border-slate-100 pt-4">
        <legend className="sr-only">{l.consents.requiredLegend}</legend>
        <CheckboxField id="contact-b2b" checked={values.b2b} onChange={(v) => set("b2b", v)} error={errors.b2b} required>
          {l.consents.b2bContact}
        </CheckboxField>
        <CheckboxField id="contact-consent" checked={values.consent} onChange={(v) => set("consent", v)} error={errors.consent} required>
          {l.consents.processing}{" "}
          <span className="text-slate-500">
            {l.consents.privacyNotePrefix}{" "}
            <Link href="/datenschutz" className="font-medium text-navy-700 underline underline-offset-2">
              {l.consents.privacyNoteLink}
            </Link>
            .
          </span>
        </CheckboxField>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold tracking-wide text-slate-600 uppercase">{l.consents.optionalLegend}</legend>
        <CheckboxField id="contact-marketing" checked={values.marketingEmail} onChange={(v) => set("marketingEmail", v)}>
          {l.consents.marketingEmail}
        </CheckboxField>
        <CheckboxField
          id="contact-callback"
          checked={values.phoneCallback && values.phone.trim() !== ""}
          onChange={(v) => set("phoneCallback", v)}
          disabled={values.phone.trim() === ""}
          hint={values.phone.trim() === "" ? l.consents.phoneCallbackHint : undefined}
        >
          {l.consents.phoneCallback}
        </CheckboxField>
      </fieldset>
      <div className="flex justify-end border-t border-slate-100 pt-4">
        <Button type="submit" variant="primary" size="lg" loading={status === "sending"}>
          {status === "sending" ? t.sending : t.submit}
        </Button>
      </div>
    </form>
  );
}

function CheckboxField({
  id,
  checked,
  onChange,
  error,
  hint,
  required,
  disabled,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className={`flex items-start gap-2.5 text-sm leading-snug ${disabled ? "text-slate-500" : "text-slate-700"}`}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="mt-0.5 size-4 shrink-0 rounded border-slate-300 accent-navy-800"
        />
        <span>{children}</span>
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 pl-6.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 pl-6.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
