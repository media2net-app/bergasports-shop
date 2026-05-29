import Link from "next/link";

import { HOME_APPOINTMENT } from "@/lib/site-content";
import { SITE_EMAIL } from "@/lib/site-brand";
import { SHOP_PHONE_LABEL, SITE_ADDRESS, shopPhoneTelHref } from "@/lib/site-contact";

export default function HomeAppointmentSection() {
  return (
    <section
      className="rounded-2xl bg-[var(--topbar)] px-6 py-8 text-[var(--topbar-foreground)] md:px-10 md:py-10"
      aria-labelledby="home-appointment-title"
    >
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <div>
          <h2 id="home-appointment-title" className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
            {HOME_APPOINTMENT.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--topbar-muted)] md:text-base">
            {HOME_APPOINTMENT.text}
          </p>
          <p className="mt-6 text-sm font-semibold text-white">{HOME_APPOINTMENT.phoneCta}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={shopPhoneTelHref()} className="font-semibold text-[var(--brand-mid)] hover:underline">
                {SHOP_PHONE_LABEL}
              </a>
            </li>
            <li className="text-[var(--topbar-muted)]">{SITE_ADDRESS}</li>
            <li>
              <a href={`mailto:${SITE_EMAIL}`} className="text-[var(--topbar-muted)] hover:text-white hover:underline">
                {SITE_EMAIL}
              </a>
            </li>
          </ul>
          <p className="mt-6">
            <Link
              href="/contact"
              className="inline-flex rounded-full bg-[var(--brand-mid)] px-6 py-3 text-sm font-bold text-[#1a1a1a] transition hover:bg-[#f2d680]"
            >
              Neem contact op
            </Link>
          </p>
        </div>

        <form
          className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-5"
          action={`mailto:${SITE_EMAIL}`}
          method="post"
          encType="text/plain"
        >
          <p className="text-sm font-semibold text-white">Plan direct een afspraak</p>
          <div className="mt-3 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--topbar-muted)]">
              Naam
              <input
                name="Naam"
                required
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#0f1114] px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand-mid)]"
                placeholder="Jouw naam"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--topbar-muted)]">
              Telefoon
              <input
                name="Telefoon"
                required
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#0f1114] px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand-mid)]"
                placeholder="+31 ..."
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--topbar-muted)]">
              E-mail
              <input
                name="E-mail"
                type="email"
                required
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#0f1114] px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand-mid)]"
                placeholder="jij@email.nl"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--topbar-muted)]">
              Gewenste datum/tijd
              <input
                name="Datum_tijd"
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#0f1114] px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand-mid)]"
                placeholder="Bijv. dinsdag 14:00"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--topbar-muted)]">
              Bericht
              <textarea
                name="Bericht"
                rows={3}
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#0f1114] px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand-mid)]"
                placeholder="Waar wil je advies over?"
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-4 inline-flex rounded-full bg-[var(--brand-mid)] px-5 py-2.5 text-sm font-bold text-[#1a1a1a] transition hover:bg-[#f2d680]"
          >
            Verzoek versturen
          </button>
        </form>
      </div>
    </section>
  );
}
