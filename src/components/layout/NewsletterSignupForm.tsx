"use client";

import Link from "next/link";
import { useState } from "react";

import { useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import { ui } from "@/lib/i18n/ui";
import { LEGAL_PAGE_PATHS } from "@/lib/site-content";

type Props = {
  promoLabel: string;
  source?: string;
};

export default function NewsletterSignupForm({
  promoLabel,
  source = "footer",
}: Props) {
  const { locale } = useShopLocale();
  const t = ui(locale);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ code: string; label: string; already: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, locale }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        label?: string;
        alreadySubscribed?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? t.newsletterFail);
      } else if (!data.code) {
        setError(t.newsletterCodeMissing);
      } else {
        setDone({
          code: data.code,
          label: data.label || promoLabel,
          already: Boolean(data.alreadySubscribed),
        });
      }
    } catch {
      setError(t.newsletterOffline);
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-sm">
        <p className="font-medium text-[var(--topbar-foreground)]">
          {done.already ? t.newsletterAlready : t.newsletterOk}
        </p>
        <p className="mt-2 text-[var(--topbar-muted)]">
          {t.newsletterCode}{" "}
          <code className="rounded bg-[var(--brand-mid)]/20 px-1.5 py-0.5 font-semibold tracking-wide text-[var(--brand-mid)]">
            {done.code}
          </code>{" "}
          ({done.label})
        </p>
        <p className="mt-1 text-xs text-[var(--topbar-muted)]">{t.newsletterCheckoutHint}</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <label className="sr-only" htmlFor="newsletter-email">
          {t.emailAddress}
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.emailPlaceholder}
          disabled={busy}
          className="min-h-11 flex-1 rounded-full border border-white/20 bg-white/10 px-4 text-sm text-[var(--topbar-foreground)] outline-none placeholder:text-[var(--topbar-muted)] focus:border-[var(--brand-mid)] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand-mid)] px-6 text-xs font-bold uppercase tracking-[0.14em] text-[#1a1a1a] transition hover:bg-[#f2d680] disabled:opacity-60"
        >
          {busy ? t.newsletterBusy : t.newsletterCta}
        </button>
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <p className="text-[11px] leading-relaxed text-[var(--topbar-muted)]">
        {t.newsletterLegal}{" "}
        <Link href={LEGAL_PAGE_PATHS.privacy} className="underline underline-offset-2 hover:text-[var(--brand-mid)]">
          {t.privacyPolicy}
        </Link>
        . {t.newsletterUnsubscribe}
      </p>
    </form>
  );
}
