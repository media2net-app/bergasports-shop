import { DEFAULT_LOCALE, isKnownLocalePrefix, isLocaleCode } from "@/lib/i18n/locale-codes";

export type AppLocale = string;

export { DEFAULT_LOCALE, isKnownLocalePrefix, isLocaleCode };

const NL_HOSTS = new Set([
  "bergasports.nl",
  "www.bergasports.nl",
  "localhost",
  "127.0.0.1",
]);

/** Host-based fallback: .nl → nl, .com → en. Path prefix wins when present. */
export function localeFromHost(host: string | null | undefined): AppLocale {
  const h = (host || "").split(":")[0].toLowerCase();
  if (!h) return DEFAULT_LOCALE;
  if (h.endsWith(".bergasports.nl") || NL_HOSTS.has(h)) return DEFAULT_LOCALE;
  if (h.endsWith(".bergasports.com") || h === "bergasports.com" || h === "www.bergasports.com") {
    return "en";
  }
  return DEFAULT_LOCALE;
}

export function peerDomainForLocale(locale: AppLocale): string {
  return locale === "en" ? "https://bergasports.com" : "https://bergasports.nl";
}

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

export function withLocalePrefix(
  pathname: string,
  locale: string,
  defaultLocale: string = DEFAULT_LOCALE,
): string {
  const { pathname: clean } = stripLocalePrefix(pathname);
  const path = clean.startsWith("/") ? clean : `/${clean}`;
  const normalized = path === "" ? "/" : path;
  if (!locale || locale === defaultLocale) {
    return normalized;
  }
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

/** Prefix a storefront href (path + query + hash). Leaves admin/api/external URLs alone. */
export function localizedHref(
  href: string,
  locale: string,
  defaultLocale: string = DEFAULT_LOCALE,
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
    return `${withLocalePrefix(url.pathname, locale, defaultLocale)}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

/** Map a path on the current locale to the peer locale path (best-effort, plus prefix). */
export function mapPathToLocale(pathname: string, target: AppLocale): string {
  const { pathname: path } = stripLocalePrefix(pathname);
  const mapNlToEn: Record<string, string> = {
    "/": "/",
    "/nieuws": "/news",
    "/over-ons": "/about-us",
    "/onderhoud": "/service",
    "/verzending": "/shipping",
    "/retouren": "/returns",
    "/racefietsen": "/road-bikes",
    "/fietsen": "/bikes",
    "/gravel": "/gravel",
    "/mtb": "/mtb",
    "/skeelers": "/speed-skates",
    "/tweedehands": "/used-bikes",
    "/wielen": "/wheels",
    "/wielrenschoenen": "/cycling-shoes",
    "/lafuga": "/lafuga",
    "/brillen": "/glasses",
    "/accessoires": "/accessories",
    "/helmen": "/cycling-helmets",
    "/schoenplaatjes": "/cleats",
    "/groepsets": "/group-sets",
    "/scope-outlet": "/scope-outlet",
    "/contact": "/contact",
    "/shop": "/shop",
    "/account": "/account",
  };
  const mapEnToNl = Object.fromEntries(Object.entries(mapNlToEn).map(([nl, en]) => [en, nl]));

  let mapped = path;
  if (path.startsWith("/nieuws/")) {
    mapped = target === "en" ? path.replace("/nieuws/", "/news/") : path;
  } else if (path.startsWith("/news/")) {
    mapped = target === "nl" || target === DEFAULT_LOCALE ? path.replace("/news/", "/nieuws/") : path;
  } else if (!path.startsWith("/product/")) {
    const table = target === "en" ? mapNlToEn : mapEnToNl;
    if (table[path]) mapped = table[path];
    else {
      const trimmed = path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
      if (table[trimmed]) mapped = table[trimmed];
    }
  }

  return withLocalePrefix(mapped, target);
}

export function languageAlternateUrl(pathname: string, target: AppLocale): string {
  return mapPathToLocale(pathname, target);
}

export function localeFromPathname(pathname: string, fallback: AppLocale = DEFAULT_LOCALE): AppLocale {
  const { locale } = stripLocalePrefix(pathname);
  return locale && isLocaleCode(locale) ? locale : fallback;
}
