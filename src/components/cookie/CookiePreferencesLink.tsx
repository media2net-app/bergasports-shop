"use client";

import { useCookieConsent } from "@/components/cookie/CookieConsentProvider";
import { useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import { ui } from "@/lib/i18n/ui";

export default function CookiePreferencesLink({ className = "" }: { className?: string }) {
  const { openSettings } = useCookieConsent();
  const { locale } = useShopLocale();
  const t = ui(locale);

  return (
    <button
      type="button"
      onClick={openSettings}
      className={`text-left hover:underline ${className}`.trim()}
    >
      {t.cookiePrefs}
    </button>
  );
}
