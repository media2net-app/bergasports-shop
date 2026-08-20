import { DEFAULT_LOCALE, isKnownLocalePrefix, isLocaleCode } from "@/lib/i18n/locale-codes";

export type AppLocale = string;

export { DEFAULT_LOCALE, isKnownLocalePrefix, isLocaleCode };

/** Cookie voor lokale taalschakelaar (alleen localhost). */
export const DEV_LOCALE_COOKIE = "bergasports_dev_locale";

const NL_HOSTS = new Set([
  "bergasports.nl",
  "www.bergasports.nl",
  "localhost",
  "127.0.0.1",
]);

export function isLocalDevHost(host: string | null | undefined): boolean {
  const h = (host || "").split(":")[0].toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".local");
}

/** Host bepaalt de taal: .nl → nl, .com → en. Geen pad-prefix (/en/…). */
export function localeFromHost(host: string | null | undefined): AppLocale {
  const h = (host || "").split(":")[0].toLowerCase();
  if (!h) return DEFAULT_LOCALE;
  if (h.endsWith(".bergasports.nl") || NL_HOSTS.has(h)) return DEFAULT_LOCALE;
  if (h.endsWith(".bergasports.com") || h === "bergasports.com" || h === "www.bergasports.com") {
    return "en";
  }
  return DEFAULT_LOCALE;
}

/** Productie-peer-domein. Lokaal: zelfde origin + ?lang=. */
export function peerDomainForLocale(locale: AppLocale): string {
  return locale === "en" ? "https://www.bergasports.com" : "https://www.bergasports.nl";
}

function siteUrlFromEnv(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
}

/** Strip legacy /en|/de|… prefixes (worden 301’d). */
export function stripLocalePrefix(pathname: string): { locale: string | null; pathname: string } {
  const raw = pathname.split("?")[0] || "/";
  const parts = raw.split("/").filter(Boolean);
  const first = parts[0]?.toLowerCase() ?? "";
  if (!first || !isKnownLocalePrefix(first)) {
    return { locale: null, pathname: raw || "/" };
  }
  const rest = `/${parts.slice(1).join("/")}`;
  return { locale: first, pathname: rest === "/" ? "/" : rest.replace(/\/+$/, "") || "/" };
}

/**
 * Publieke URLs hebben geen taalprefix — .nl en .com delen dezelfde padstructuur.
 * Locale-argument blijft voor API-compatibiliteit; het wordt genegeerd.
 */
export function withLocalePrefix(
  pathname: string,
  _locale?: string,
  _defaultLocale: string = DEFAULT_LOCALE,
): string {
  const { pathname: clean } = stripLocalePrefix(pathname);
  const path = clean.startsWith("/") ? clean : `/${clean}`;
  return path === "" ? "/" : path;
}

/** Storefront href zonder taalprefix. Admin/api/externe URL’s ongemoeid. */
export function localizedHref(
  href: string,
  _locale?: string,
  _defaultLocale: string = DEFAULT_LOCALE,
): string {
  const trimmed = href.trim();
  if (!trimmed) return href;
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("javascript:")
  ) {
    return href;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("//")) {
    return href;
  }
  if (!trimmed.startsWith("/")) return href;
  if (trimmed.startsWith("/admin") || trimmed.startsWith("/api") || trimmed.startsWith("/_next")) {
    return href;
  }
  try {
    const url = new URL(trimmed, "https://bergasports.invalid");
    return `${withLocalePrefix(url.pathname)}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

/**
 * Zelfde pad op het peer-domein (geen /en, geen slug-vertaling).
 * Taal wisselen = domein wisselen (lokaal: ?lang=).
 */
export function mapPathToLocale(pathname: string, _target?: AppLocale): string {
  return withLocalePrefix(pathname);
}

function isLocalDevSiteUrl(siteUrl: string): boolean {
  if (!siteUrl) return false;
  try {
    return isLocalDevHost(new URL(siteUrl).hostname);
  } catch {
    return /localhost|127\.0\.0\.1/i.test(siteUrl);
  }
}

/**
 * Taalschakelaar-URL.
 * Productie: peer-domein + zelfde pad.
 * Lokaal (NEXT_PUBLIC_SITE_URL=localhost): relatief pad + ?lang=nl|en.
 */
export function languageAlternateUrl(pathname: string, target: AppLocale): string {
  const path = withLocalePrefix(pathname);
  const site = siteUrlFromEnv();

  if (isLocalDevSiteUrl(site)) {
    const url = new URL(path === "/" ? "/" : path, "http://localhost");
    url.searchParams.set("lang", target);
    return `${url.pathname}?${url.searchParams.toString()}`;
  }

  const origin = peerDomainForLocale(target);
  return path === "/" ? `${origin}/` : `${origin}${path}`;
}

export function localeFromPathname(_pathname: string, fallback: AppLocale = DEFAULT_LOCALE): AppLocale {
  return fallback;
}
