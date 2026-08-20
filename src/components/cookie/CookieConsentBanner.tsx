"use client";

import LocalizedLink from "@/components/locale/LocalizedLink";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useCookieConsent } from "@/components/cookie/CookieConsentProvider";
import { useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import { ui } from "@/lib/i18n/ui";
import { LEGAL_PAGE_PATHS } from "@/lib/site-content";

export default function CookieConsentBanner() {
  const pathname = usePathname() ?? "";
  const isAdmin = pathname.startsWith("/admin");
  const { locale } = useShopLocale();
  const t = ui(locale);

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
          {showSettings ? t.cookiePrefs : t.cookieTitle}
        </h2>

        {showSettings ? (
          <div className="mt-4 space-y-4 text-sm text-[#f0ead8]/95">
            <label className="flex gap-3 opacity-80">
              <input type="checkbox" checked disabled className="mt-1" />
              <span>
                <strong className="text-[#faf8f5]">{t.cookieEssential}</strong> — {t.cookieEssentialDesc}
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
                <strong className="text-[#faf8f5]">{t.cookieAnalytics}</strong> — {t.cookieAnalyticsDesc}
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
                <strong className="text-[#faf8f5]">{t.cookieMarketing}</strong> — {t.cookieMarketingDesc}
              </span>
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => savePreferences(analytics, marketing)}
                className="rounded-full bg-[#faf8f5] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-white"
              >
                {t.cookieSave}
              </button>
              <button
                type="button"
                onClick={closeSettings}
                className="rounded-full border border-[#f0ead8]/40 px-4 py-2 text-sm hover:bg-[#f0ead8]/10"
              >
                {t.cookieBack}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-[#f0ead8]/90">{t.cookieBody}</p>
            <p className="mt-2 text-xs text-[#f0ead8]/70">
              {t.cookieMoreIn}{" "}
              <LocalizedLink href={LEGAL_PAGE_PATHS.cookies} className="underline hover:text-[#faf8f5]">
                {t.cookiePolicy}
              </LocalizedLink>{" "}
              {t.and}{" "}
              <LocalizedLink href={LEGAL_PAGE_PATHS.privacy} className="underline hover:text-[#faf8f5]">
                {t.privacyPolicy}
              </LocalizedLink>
              .
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-full bg-[#faf8f5] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-white"
              >
                {t.cookieAcceptAll}
              </button>
              <button
                type="button"
                onClick={openSettings}
                className="rounded-full border border-[#f0ead8]/40 px-4 py-2 text-sm hover:bg-[#f0ead8]/10"
              >
                {t.cookieCustomize}
              </button>
              <button
                type="button"
                onClick={rejectNonEssential}
                className="rounded-full px-4 py-2 text-sm text-[#f0ead8]/90 underline-offset-2 hover:underline"
              >
                {t.cookieEssentialOnly}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
