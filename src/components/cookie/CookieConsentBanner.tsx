"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useCookieConsent } from "@/components/cookie/CookieConsentProvider";
import { LEGAL_PAGE_PATHS } from "@/lib/site-content";

export default function CookieConsentBanner() {
  const pathname = usePathname() ?? "";
  const isAdmin = pathname.startsWith("/admin");

  const {
    showBanner,
    showSettings,
    acceptAll,
    rejectNonEssential,
    openSettings,
    closeSettings,
    savePreferences,
    consent,
  } = useCookieConsent();

  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (showSettings && consent) {
      setAnalytics(consent.analytics);
      setMarketing(consent.marketing);
    } else if (showSettings) {
      setAnalytics(false);
      setMarketing(false);
    }
  }, [showSettings, consent]);

  const panelOpen = showBanner || showSettings;
  if (isAdmin || !panelOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-modal="true"
      className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#f0ead8]/20 bg-[#B38F27] p-5 text-[#faf8f5] shadow-2xl sm:p-6">
        <h2 id="cookie-consent-title" className="text-lg font-semibold">
          {showSettings ? "Cookievoorkeuren" : "Jouw privacy telt"}
        </h2>

        {showSettings ? (
          <div className="mt-4 space-y-4 text-sm text-[#f0ead8]/95">
            <label className="flex gap-3 opacity-80">
              <input type="checkbox" checked disabled className="mt-1" />
              <span>
                <strong className="text-[#faf8f5]">Essentieel</strong> — winkelwagen, sessie, beveiliging
                (verplicht)
              </span>
            </label>
            <label className="flex cursor-pointer gap-3">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1"
              />
              <span>
                <strong className="text-[#faf8f5]">Analytisch</strong> — geaggregeerde statistieken over
                sitegebruik (bezoeken, pagina&apos;s, winkelwagen)
              </span>
            </label>
            <label className="flex cursor-pointer gap-3">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-1"
              />
              <span>
                <strong className="text-[#faf8f5]">Marketing</strong> — campagnemeting (bijv. TikTok) en
                remarketing
              </span>
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => savePreferences(analytics, marketing)}
                className="rounded-full bg-[#faf8f5] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-white"
              >
                Voorkeuren opslaan
              </button>
              <button
                type="button"
                onClick={closeSettings}
                className="rounded-full border border-[#f0ead8]/40 px-4 py-2 text-sm hover:bg-[#f0ead8]/10"
              >
                Terug
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-[#f0ead8]/90">
              We gebruiken essentiële cookies voor winkelwagen en bestelling. Met jouw toestemming kunnen we ook
              analytische en marketingcookies gebruiken. Je kunt je keuze altijd aanpassen.
            </p>
            <p className="mt-2 text-xs text-[#f0ead8]/70">
              Meer in{" "}
              <Link href={LEGAL_PAGE_PATHS.cookies} className="underline hover:text-[#faf8f5]">
                cookiebeleid
              </Link>{" "}
              en{" "}
              <Link href={LEGAL_PAGE_PATHS.privacy} className="underline hover:text-[#faf8f5]">
                privacybeleid
              </Link>
              .
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-full bg-[#faf8f5] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-white"
              >
                Alles accepteren
              </button>
              <button
                type="button"
                onClick={openSettings}
                className="rounded-full border border-[#f0ead8]/40 px-4 py-2 text-sm hover:bg-[#f0ead8]/10"
              >
                Aanpassen
              </button>
              <button
                type="button"
                onClick={rejectNonEssential}
                className="rounded-full px-4 py-2 text-sm text-[#f0ead8]/90 underline-offset-2 hover:underline"
              >
                Alleen essentieel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
