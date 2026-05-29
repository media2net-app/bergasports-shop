"use client";

import { useCookieConsent } from "@/components/cookie/CookieConsentProvider";

export default function CookiePreferencesLink({ className = "" }: { className?: string }) {
  const { openSettings } = useCookieConsent();

  return (
    <button
      type="button"
      onClick={openSettings}
      className={`text-left hover:underline ${className}`.trim()}
    >
      Cookievoorkeuren
    </button>
  );
}
