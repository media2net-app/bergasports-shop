"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import DateTimePicker from "@/components/ui/DateTimePicker";
import { appointmentDateRange } from "@/lib/datetime-picker";
import type { OpeningHoursRow } from "@/lib/opening-hours";
import { LEGAL_PAGE_PATHS, SHOP_OPENING_HOURS } from "@/lib/site-content";

export default function ContactLeadForm({
  kind = "contact",
  className = "",
  hideHeading = false,
  hours = SHOP_OPENING_HOURS,
}: {
  kind?: "contact" | "appointment";
  className?: string;
  hideHeading?: boolean;
  hours?: OpeningHoursRow[];
}) {
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
      setError("Accepteer de algemene voorwaarden en het privacybeleid.");
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
        setError(data.error ?? "Verzenden mislukt");
      } else {
        setOk(true);
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  const fieldClass =
    "mt-1 w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--brand)]";

  if (ok) {
    return (
      <p className="rounded-3xl border border-[var(--brand-border)] bg-white px-5 py-4 text-sm leading-relaxed">
        Bedankt, we nemen zo snel mogelijk contact op — meestal dezelfde werkdag.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className={`space-y-3 rounded-3xl border border-[var(--brand-border)] bg-white p-5 shadow-[0_8px_30px_-18px_rgb(26_21_36_/_0.35)] md:p-6 ${className}`.trim()}
    >
      {hideHeading ? null : (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
            {kind === "appointment" ? "Afspraak" : "Bericht"}
          </p>
          <h2 className="font-[family-name:var(--font-heading)] text-xl tracking-tight">
            {kind === "appointment" ? "Plan een afspraak" : "Stuur een bericht"}
          </h2>
        </>
      )}
      <p className="text-sm leading-relaxed text-[var(--foreground)]/70">
        {kind === "appointment"
          ? "Vertel kort waarvoor je komt: advies, passen of onderhoud. We bevestigen per telefoon of e-mail."
          : "Vragen over een bestelling, de winkel of een product? Vermeld het ordernummer als je die hebt."}
      </p>
      <label className="block text-sm font-medium">
        Naam
        <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="block text-sm font-medium">
        E-mail
        <input
          className={fieldClass}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Telefoon
        <input className={fieldClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      {kind === "appointment" ? (
        <label className="block text-sm font-medium" htmlFor="appointment-datetime">
          Voorkeursdatum en -tijd
          <DateTimePicker
            id="appointment-datetime"
            mode="datetime"
            value={preferredDate}
            onChange={setPreferredDate}
            hours={hours}
            min={range.min}
            max={range.max}
            placeholder="Kies een moment in de openingstijden"
          />
        </label>
      ) : null}
      <label className="block text-sm font-medium">
        Bericht
        <textarea
          className={fieldClass}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          placeholder={
            kind === "appointment"
              ? "Bijv. Nimbl passen, onderhoudsbeurt of advies over een gravelbike"
              : "Waarmee kunnen we je helpen?"
          }
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
          Ik ga akkoord met de{" "}
          <Link href={LEGAL_PAGE_PATHS.terms} className="underline">
            algemene voorwaarden
          </Link>{" "}
          en het{" "}
          <Link href={LEGAL_PAGE_PATHS.privacy} className="underline">
            privacybeleid
          </Link>
          .
        </span>
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className={
          kind === "appointment"
            ? "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--brand-mid)] px-5 text-xs font-bold uppercase tracking-[0.14em] text-[#1a1a1a] transition hover:bg-[#f2d680] disabled:opacity-60"
            : "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--topbar)] px-5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#2a2a2a] disabled:opacity-60"
        }
      >
        {busy ? "Verzenden…" : kind === "appointment" ? "Plan afspraak" : "Bericht versturen"}
      </button>
    </form>
  );
}
