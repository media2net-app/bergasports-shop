"use client";

import { useState } from "react";

export default function ContactLeadForm({ kind = "contact" }: { kind?: "contact" | "appointment" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message, kind, preferredDate }),
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

  if (ok) {
    return (
      <p className="rounded-xl border border-[var(--brand-border)] bg-white px-4 py-3 text-sm">
        Bedankt, we nemen zo snel mogelijk contact op.
      </p>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-8 max-w-[520px] space-y-3 rounded-2xl border border-[var(--brand-border)] bg-white p-5">
      <h2 className="font-[family-name:var(--font-heading)] text-xl">
        {kind === "appointment" ? "Afspraak aanvragen" : "Stuur een bericht"}
      </h2>
      <label className="block text-sm">
        Naam
        <input className="mt-1 w-full rounded-md border border-[var(--brand-border)] px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="block text-sm">
        E-mail
        <input className="mt-1 w-full rounded-md border border-[var(--brand-border)] px-3 py-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="block text-sm">
        Telefoon
        <input className="mt-1 w-full rounded-md border border-[var(--brand-border)] px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      {kind === "appointment" ? (
        <label className="block text-sm">
          Voorkeursdatum
          <input className="mt-1 w-full rounded-md border border-[var(--brand-border)] px-3 py-2" type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
        </label>
      ) : null}
      <label className="block text-sm">
        Bericht
        <textarea className="mt-1 w-full rounded-md border border-[var(--brand-border)] px-3 py-2" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 items-center bg-[var(--topbar)] px-5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60"
      >
        {busy ? "Verzenden…" : "Versturen"}
      </button>
    </form>
  );
}
