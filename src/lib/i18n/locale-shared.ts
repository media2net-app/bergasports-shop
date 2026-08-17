import type { AppLocale } from "@/lib/category-slugs";

export type { AppLocale };

const NL_HOSTS = new Set([
  "bergasports.nl",
  "www.bergasports.nl",
  "localhost",
  "127.0.0.1",
]);

/** Host-based locale: .nl → nl, .com → en. Preview/Vercel defaults to nl. */
export function localeFromHost(host: string | null | undefined): AppLocale {
  const h = (host || "").split(":")[0].toLowerCase();
  if (!h) return "nl";
  if (h.endsWith(".bergasports.nl") || NL_HOSTS.has(h)) return "nl";
  if (h.endsWith(".bergasports.com") || h === "bergasports.com" || h === "www.bergasports.com") {
    return "en";
  }
  return "nl";
}

export function peerDomainForLocale(locale: AppLocale): string {
  return locale === "en" ? "https://bergasports.com" : "https://bergasports.nl";
}

/** Map a path on the current locale to the peer locale path (best-effort). */
export function mapPathToLocale(pathname: string, target: AppLocale): string {
  const path = pathname.split("?")[0] || "/";
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

  if (path.startsWith("/nieuws/")) {
    return target === "en" ? path.replace("/nieuws/", "/news/") : path;
  }
  if (path.startsWith("/news/")) {
    return target === "nl" ? path.replace("/news/", "/nieuws/") : path;
  }
  if (path.startsWith("/product/")) return path;

  const table = target === "en" ? mapNlToEn : mapEnToNl;
  if (table[path]) return table[path];

  const trimmed = path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
  if (table[trimmed]) return table[trimmed];

  return path;
}

export function languageAlternateUrl(pathname: string, target: AppLocale): string {
  return `${peerDomainForLocale(target)}${mapPathToLocale(pathname, target)}`;
}
