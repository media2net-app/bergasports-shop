"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  acceptAllCookieConsent,
  COOKIE_CONSENT_VERSION,
  essentialOnlyCookieConsent,
  readStoredConsent,
  writeStoredConsent,
  type CookieConsent,
} from "@/lib/cookie-consent";

type CookieConsentContextValue = {
  ready: boolean;
  consent: CookieConsent | null;
  showBanner: boolean;
  showSettings: boolean;
  hasAnalytics: boolean;
  hasMarketing: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  savePreferences: (analytics: boolean, marketing: boolean) => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return ctx;
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setConsent(readStoredConsent());
    setReady(true);
  }, []);

  const persist = useCallback((next: CookieConsent) => {
    writeStoredConsent(next);
    setConsent(next);
    setShowSettings(false);
  }, []);

  const acceptAll = useCallback(() => persist(acceptAllCookieConsent()), [persist]);
  const rejectNonEssential = useCallback(() => persist(essentialOnlyCookieConsent()), [persist]);

  const savePreferences = useCallback(
    (analytics: boolean, marketing: boolean) => {
      persist({
        version: COOKIE_CONSENT_VERSION,
        necessary: true,
        analytics,
        marketing,
        updatedAt: new Date().toISOString(),
      });
    },
    [persist],
  );

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      ready,
      consent,
      showBanner: ready && consent === null,
      showSettings,
      hasAnalytics: Boolean(consent?.analytics),
      hasMarketing: Boolean(consent?.marketing),
      acceptAll,
      rejectNonEssential,
      openSettings: () => setShowSettings(true),
      closeSettings: () => setShowSettings(false),
      savePreferences,
    }),
    [
      ready,
      consent,
      showSettings,
      acceptAll,
      rejectNonEssential,
      savePreferences,
    ],
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}
