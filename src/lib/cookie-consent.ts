export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_STORAGE_KEY = "esh_cookie_consent_v1";
export const COOKIE_CONSENT_COOKIE_NAME = "esh_cookie_consent";

export type CookieConsentChoices = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export type CookieConsent = CookieConsentChoices & {
  version: number;
  updatedAt: string;
};

export function defaultCookieConsent(overrides?: Partial<CookieConsentChoices>): CookieConsent {
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics: overrides?.analytics ?? false,
    marketing: overrides?.marketing ?? false,
    updatedAt: new Date().toISOString(),
  };
}

export function acceptAllCookieConsent(): CookieConsent {
  return defaultCookieConsent({ analytics: true, marketing: true });
}

export function essentialOnlyCookieConsent(): CookieConsent {
  return defaultCookieConsent({ analytics: false, marketing: false });
}

export function parseCookieConsent(raw: unknown): CookieConsent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== COOKIE_CONSENT_VERSION) return null;
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics: Boolean(o.analytics),
    marketing: Boolean(o.marketing),
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
  };
}

function encodeConsentCookie(consent: CookieConsent): string {
  return encodeURIComponent(
    JSON.stringify({
      v: consent.version,
      a: consent.analytics ? 1 : 0,
      m: consent.marketing ? 1 : 0,
    }),
  );
}

export function readConsentFromCookieString(cookieHeader: string | null | undefined): CookieConsent | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey !== COOKIE_CONSENT_COOKIE_NAME) continue;
    const rawValue = rest.join("=");
    if (!rawValue) return null;
    try {
      const decoded = decodeURIComponent(rawValue);
      const parsed = JSON.parse(decoded) as { v?: number; a?: number; m?: number };
      if (parsed.v !== COOKIE_CONSENT_VERSION) return null;
      return defaultCookieConsent({
        analytics: parsed.a === 1,
        marketing: parsed.m === 1,
      });
    } catch {
      return null;
    }
  }
  return null;
}

export function readStoredConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return readConsentFromCookieString(document.cookie);
    return parseCookieConsent(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStoredConsent(consent: CookieConsent): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    /* ignore quota */
  }
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${encodeConsentCookie(consent)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function hasAnalyticsConsent(consent: CookieConsent | null | undefined): boolean {
  return Boolean(consent?.analytics);
}

export function hasMarketingConsent(consent: CookieConsent | null | undefined): boolean {
  return Boolean(consent?.marketing);
}

/** Client-side check for TikTok / marketing trackers (reads storage synchronously). */
export function readMarketingConsentSync(): boolean {
  return hasMarketingConsent(readStoredConsent());
}
