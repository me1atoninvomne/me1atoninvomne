"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { marketingPagesDict } from "@/i18n/ui/marketing-pages";
import { Button } from "../ui/button";
import { Callout } from "../ui/feedback";
import { Input, Label, Select, Textarea } from "../ui/form";

type Values = { name: string; company: string; email: string; phone: string; employees: string; process: string; message: string; consent: boolean; website: string };
type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = { name: "", company: "", email: "", phone: "", employees: "", process: "", message: "", consent: false, website: "" };

export function ContactForm() {
  const t = useT(marketingPagesDict).contact;
  const [values, setValues] = useState<Values>(EMPTY);
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
    if (!values.consent) e.consent = t.consentRequired;
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
          consent: true,
          website: values.website,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200" role="status">
        <CheckCircle2 className="size-8 text-emerald-600" />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">{t.successTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.successText}</p>
        <Button
          className="mt-5"
          onClick={() => {
            setValues(EMPTY);
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
      <div>
        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input
            id="contact-consent"
            type="checkbox"
            checked={values.consent}
            onChange={(e) => set("consent", e.target.checked)}
            className="mt-0.5 size-4 rounded border-slate-300 accent-navy-800"
            aria-describedby={errors.consent ? "contact-consent-error" : undefined}
          />
          {t.consent}
        </label>
        {err("consent")}
      </div>
      <div className="flex justify-end border-t border-slate-100 pt-4">
        <Button type="submit" variant="primary" size="lg" loading={status === "sending"}>
          {status === "sending" ? t.sending : t.submit}
        </Button>
      </div>
    </form>
  );
}
