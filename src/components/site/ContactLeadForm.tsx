"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import DateTimePicker from "@/components/ui/DateTimePicker";
import { appointmentDateRange } from "@/lib/datetime-picker";
import { ui } from "@/lib/i18n/ui";
import type { OpeningHoursRow } from "@/lib/opening-hours";
import { LEGAL_PAGE_PATHS, SHOP_OPENING_HOURS } from "@/lib/site-content";

export default function ContactLeadForm({
  kind = "contact",
  className = "",
  hideHeading = false,
  hours = SHOP_OPENING_HOURS,
}: {
  kind?: "contact" | "appointment" | "lafuga";
  className?: string;
  hideHeading?: boolean;
  hours?: OpeningHoursRow[];
}) {
  const { locale } = useShopLocale();
  const t = ui(locale);
  const range = useMemo(() => appointmentDateRange(90), []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!legalAccepted) {
      setError(t.errAcceptLegal);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          message,
          kind,
          preferredDate,
          legalAccepted: true,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t.sendFailed);
      } else {
        setOk(true);
      }
    } catch {
      setError(t.noConnection);
    }
    setBusy(false);
  }

  const fieldClass =
    "mt-1 w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--brand)]";

  if (ok) {
    return (
      <p className="rounded-3xl border border-[var(--brand-border)] bg-white px-5 py-4 text-sm leading-relaxed">
        {t.leadThanks}
      </p>
    );
  }

  const eyebrow =
    kind === "appointment"
      ? t.leadEyebrowAppointment
      : kind === "lafuga"
        ? t.leadEyebrowLafuga
        : t.leadEyebrowContact;
  const title =
    kind === "appointment"
      ? t.leadTitleAppointment
      : kind === "lafuga"
        ? t.leadTitleLafuga
        : t.leadTitleContact;
  const intro =
    kind === "appointment"
      ? t.leadIntroAppointment
      : kind === "lafuga"
        ? t.leadIntroLafuga
        : t.leadIntroContact;
  const placeholder =
    kind === "appointment"
      ? t.placeholderAppointment
      : kind === "lafuga"
        ? t.placeholderLafuga
        : t.placeholderContact;
  const cta =
    kind === "appointment"
      ? t.planAppointmentShort
      : kind === "lafuga"
        ? t.requestCustom
        : t.sendMessage;

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className={`space-y-3 rounded-3xl border border-[var(--brand-border)] bg-white p-5 shadow-[0_8px_30px_-18px_rgb(26_21_36_/_0.35)] md:p-6 ${className}`.trim()}
    >
      {hideHeading ? null : (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">{eyebrow}</p>
          <h2 className="font-[family-name:var(--font-heading)] text-xl tracking-tight">{title}</h2>
        </>
      )}
      <p className="text-sm leading-relaxed text-[var(--foreground)]/70">{intro}</p>
      <label className="block text-sm font-medium">
        {t.fieldName}
        <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="block text-sm font-medium">
        {t.fieldEmail}
        <input
          className={fieldClass}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        {t.fieldPhone}
        <input className={fieldClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      {kind === "appointment" ? (
        <label className="block text-sm font-medium" htmlFor="appointment-datetime">
          {t.preferredDateTime}
          <DateTimePicker
            id="appointment-datetime"
            mode="datetime"
            value={preferredDate}
            onChange={setPreferredDate}
            hours={hours}
            min={range.min}
            max={range.max}
            placeholder={t.pickOpeningHours}
          />
        </label>
      ) : null}
      <label className="block text-sm font-medium">
        {t.fieldMessage}
        <textarea
          className={fieldClass}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          placeholder={placeholder}
        />
      </label>
      <label className="flex cursor-pointer items-start gap-2 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2.5 text-xs text-[var(--foreground)]/85">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={legalAccepted}
          onChange={(e) => setLegalAccepted(e.target.checked)}
          required
        />
        <span>
          {t.legalAcceptPrefix}{" "}
          <Link href={LEGAL_PAGE_PATHS.terms} className="underline">
            {t.termsOfService}
          </Link>{" "}
          {t.legalAcceptAnd}{" "}
          <Link href={LEGAL_PAGE_PATHS.privacy} className="underline">
            {t.privacyPolicyShort}
          </Link>
          .
        </span>
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className={
          kind === "appointment" || kind === "lafuga"
            ? "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--brand-mid)] px-5 text-xs font-bold uppercase tracking-[0.14em] text-[#1a1a1a] transition hover:bg-[#f2d680] disabled:opacity-60"
            : "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--topbar)] px-5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#2a2a2a] disabled:opacity-60"
        }
      >
        {busy ? t.sending : cta}
      </button>
    </form>
  );
}
