/**
 * Statische 301-regels voor de WP/Woo-cutover.
 * Geen server-only — gebruikt door next.config, proxy én import.
 */

import {
  EN_TO_WC_SLUG,
  NL_TO_WC_SLUG,
  publicCategoryPath,
  WC_TO_EN_SLUG,
  WC_TO_NL_SLUG,
} from "@/lib/category-slugs";

/** Canonieke shop-paden die we nooit als bron van een redirect stelen. */
export const CANONICAL_LIVE_PATHS = new Set([
  "/",
  "/shop",
  "/contact",
  "/over-ons",
  "/onderhoud",
  "/afspraak",
  "/merken",
  "/nieuws",
  "/news",
  "/verzending",
  "/retouren",
  "/algemene-voorwaarden",
  "/privacybeleid",
  "/cookiebeleid",
  "/betaalmethoden",
  "/checkout",
  "/account",
  "/lafuga",
  "/kleding",
  "/nimbl",
]);

/** Oude WP-pagina-slugs → bestaande CMS/legal-routes. */
export const WORDPRESS_PAGE_CANONICALS: Record<string, string> = {
  "about-bergasports": "/over-ons",
  "about-us": "/over-ons",
  "bike-repair": "/onderhoud",
  service: "/onderhoud",
  "verzendkosten-en-levertijd": "/verzending",
  shipping: "/verzending",
  "retourneren-en-garantie": "/retouren",
  returns: "/retouren",
  "privacy-policy": "/privacybeleid",
  privacy: "/privacybeleid",
  "cookie-policy": "/cookiebeleid",
  cookies: "/cookiebeleid",
  "terms-and-conditions": "/algemene-voorwaarden",
  "algemene-voorwaarden-en-privacy": "/algemene-voorwaarden",
  payment: "/betaalmethoden",
  "payment-methods": "/betaalmethoden",
  betalen: "/betaalmethoden",
};

export function normalizeRedirectPath(input: string): string {
  let path = input.trim();
  if (!path) return "";
  try {
    if (/^https?:\/\//i.test(path)) {
      path = new URL(path).pathname;
    }
  } catch {
    /* keep raw */
  }
  path = path.split("?")[0]?.split("#")[0] ?? path;
  if (!path.startsWith("/")) path = `/${path}`;
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep encoded */
  }
  if (path.length > 1) {
    path = path.replace(/\/+$/, "");
  }
  return path.toLowerCase() || "/";
}

export function wpQueryRedirectSource(kind: "p" | "page_id", id: number): string {
  return `/?${kind}=${id}`;
}

export function isWpQuerySource(path: string): boolean {
  return /^\/\?(p|page_id)=\d+$/.test(path);
}

export function shouldSkipRedirect(source: string, destination: string): boolean {
  const from = isWpQuerySource(source) ? source : normalizeRedirectPath(source);
  const to = normalizeRedirectPath(destination);
  if (!from || !to) return true;
  if (from === to) return true;
  if (from === "/") return true;
  if (from.startsWith("/admin") || from.startsWith("/api") || from.startsWith("/_next")) return true;
  if (to.startsWith("/admin") || to.startsWith("/api")) return true;
  if (!isWpQuerySource(from) && CANONICAL_LIVE_PATHS.has(from)) return true;
  return false;
}

const EXACT_STATIC: Record<string, string> = {
  "/despre-noi": "/over-ons",
  "/livrare-si-retur": "/verzending",
  "/metode-de-plata": "/betaalmethoden",
  "/termeni-si-conditii": "/algemene-voorwaarden",
  "/politica-de-confidentialitate": "/privacybeleid",
  "/politica-cookies": "/cookiebeleid",
  "/algemene-voorwaarden-en-privacy": "/algemene-voorwaarden",
  "/cookie-policy": "/cookiebeleid",
  "/terms-and-conditions": "/algemene-voorwaarden",
  "/racingbikes": "/racefietsen",
  "/cyclingshoes": "/wielrenschoenen",
  "/speedskates": "/skeelers",
  "/scope-wheels": "/wielen",
  "/scope-wheels-2": "/wielen",
  "/lafuga-kleding": "/kleding",
  "/lafuga-collectie": "/kleding",
  "/schoenen-kleding": "/wielrenschoenen",
  "/schoenen": "/wielrenschoenen",
  "/bike-repair": "/onderhoud",
  "/about-bergasports": "/over-ons",
  "/verzendkosten-en-levertijd": "/verzending",
  "/retourneren-en-garantie": "/retouren",
  "/privacy-policy": "/privacybeleid",
  "/privacy": "/privacybeleid",
  "/nl": "/",
  "/categorii": "/shop",
  "/winkel": "/shop",
  "/winkelmand": "/shop",
  "/winkelwagen": "/shop",
  "/winkelmandje": "/shop",
  "/cart": "/shop",
  "/cart-2": "/shop",
  "/bag": "/shop",
  "/afrekenen": "/shop",
  "/checkout": "/shop",
  "/my-account": "/account",
  "/mijn-account": "/account",
  "/lost-password": "/account",
  "/wachtwoord-vergeten": "/account",
  "/author/ingmar": "/over-ons",
  "/author/admin": "/over-ons",
  "/uncategorized": "/shop",
  "/uncategorized-2": "/shop",
  "/product-category/uncategorized": "/shop",
  "/product-categorie/uncategorized": "/shop",
  "/nl/product-categorie/uncategorized": "/shop",
  "/nl/product-category/uncategorized": "/shop",
  "/product-category/uncategorized-2": "/shop",
  "/product-categorie/uncategorized-2": "/shop",
  "/nl/product-categorie/uncategorized-2": "/shop",
  "/nl/product-category/uncategorized-2": "/shop",
};

for (const [wcSlug, nlSlug] of Object.entries(WC_TO_NL_SLUG)) {
  const dest = publicCategoryPath(wcSlug, "nl");
  const from = `/${wcSlug}`;
  if (from !== dest) {
    EXACT_STATIC[from] = dest;
  }
  for (const prefix of ["/product-category", "/product-categorie", "/nl/product-categorie", "/nl/product-category"]) {
    const source = `${prefix}/${wcSlug}`;
    if (source !== dest) EXACT_STATIC[source] = dest;
  }
  if (nlSlug !== wcSlug) {
    for (const prefix of ["/product-category", "/product-categorie", "/nl/product-categorie"]) {
      const source = `${prefix}/${nlSlug}`;
      if (source !== dest) EXACT_STATIC[source] = dest;
    }
  }
}

for (const [wcSlug, enSlug] of Object.entries(WC_TO_EN_SLUG)) {
  const dest = publicCategoryPath(wcSlug, "nl");
  const from = `/${enSlug}`;
  if (from !== dest) {
    EXACT_STATIC[from] = dest;
  }
  for (const prefix of ["/product-category", "/product-categorie", "/nl/product-category", "/en/product-category"]) {
    const source = `${prefix}/${enSlug}`;
    if (source !== dest) EXACT_STATIC[source] = dest;
  }
}

/** Extra aliases (apparel, shoes, lafuga, …) → canonieke shop-URL. Bare canonicals zoals /lafuga blijven merkpagina. */
const CATEGORY_PREFIXES = [
  "/product-category",
  "/product-categorie",
  "/nl/product-categorie",
  "/nl/product-category",
  "/en/product-category",
] as const;

for (const [alias, wcSlug] of Object.entries({ ...NL_TO_WC_SLUG, ...EN_TO_WC_SLUG })) {
  const dest = publicCategoryPath(wcSlug, "nl");
  const bare = `/${alias}`;
  if (!CANONICAL_LIVE_PATHS.has(bare) && bare !== dest) {
    EXACT_STATIC[bare] = dest;
  }
  for (const prefix of CATEGORY_PREFIXES) {
    const source = `${prefix}/${alias}`;
    if (source !== dest) EXACT_STATIC[source] = dest;
  }
}

for (const [oldSlug, dest] of Object.entries(WORDPRESS_PAGE_CANONICALS)) {
  EXACT_STATIC[`/${oldSlug}`] = dest;
}

export const STATIC_EXACT_SEO_REDIRECTS: Record<string, string> = EXACT_STATIC;

function stripLocalePrefix(pathname: string): string | null {
  const match = pathname.match(/^\/(nl|en)(\/.*)?$/);
  if (!match) return null;
  const rest = match[2];
  if (!rest || rest === "/") return "/";
  return rest;
}

/**
 * Patroon-match voor Woo/WP-structuren die we altijd kennen (zonder database).
 * Exacte mapping wint; daarna prefixen.
 */
export function matchStaticSeoRedirect(pathname: string): string | null {
  const path = normalizeRedirectPath(pathname);
  if (!path || path === "/") return null;

  const exact = STATIC_EXACT_SEO_REDIRECTS[path];
  if (exact && exact !== path) return exact;

  const stripped = stripLocalePrefix(path);
  if (stripped) {
    if (stripped === path) return null;
    const nested = matchStaticSeoRedirect(stripped);
    if (nested) return nested;
    if (stripped !== path && stripped !== "/") return stripped;
    if (stripped === "/") return "/";
  }

  const productCategory = path.match(/^\/product-categor(?:y|ie)\/([^/]+)(?:\/.*)?$/);
  if (productCategory?.[1]) {
    return publicCategoryPath(productCategory[1], "nl");
  }

  const shopProduct = path.match(/^\/(?:winkel|shop)\/product\/([^/]+)$/);
  if (shopProduct?.[1]) {
    return `/product/${shopProduct[1]}`;
  }

  const brand = path.match(/^\/brand\/[^/.]+$/);
  if (brand) return "/merken";

  const blog = path.match(/^\/(?:blog|nieuws|news)\/([^/]+)$/);
  if (blog?.[1] && !path.startsWith("/nieuws/")) {
    return `/nieuws/${blog[1]}`;
  }

  if (path === "/shop" || path === "/checkout" || path === "/account") {
    return null;
  }

  return null;
}

export function wordpressSourcePaths(permalink: string | null | undefined, extra: string[] = []): string[] {
  const paths = new Set<string>();
  if (permalink) {
    const normalized = normalizeRedirectPath(permalink);
    if (normalized) paths.add(normalized);
  }
  for (const item of extra) {
    const normalized = normalizeRedirectPath(item);
    if (normalized) paths.add(normalized);
  }
  for (const path of [...paths]) {
    if (path !== "/" && !path.startsWith("/nl/") && path !== "/nl") {
      paths.add(`/nl${path}`);
    }
  }
  return [...paths];
}

export type SeoRedirectKind = "static" | "product" | "category" | "news" | "page" | "woo" | "manual";

/** next.config-vorm: exacte paden + Woo-patronen. */
export function nextConfigSeoRedirects(): Array<{
  source: string;
  destination: string;
  statusCode: 301;
}> {
  const exact = Object.entries(STATIC_EXACT_SEO_REDIRECTS)
    .filter(([from, to]) => from !== to)
    .map(([source, destination]) => ({ source, destination, statusCode: 301 as const }));

  const patterns: Array<{ source: string; destination: string; statusCode: 301 }> = [
    { source: "/nl/contact", destination: "/contact", statusCode: 301 },
    { source: "/nl/shop", destination: "/shop", statusCode: 301 },
    { source: "/nl/product/:slug", destination: "/product/:slug", statusCode: 301 },
    { source: "/en/product/:slug", destination: "/product/:slug", statusCode: 301 },
    { source: "/winkel/product/:slug", destination: "/product/:slug", statusCode: 301 },
    { source: "/nl/blog/:slug", destination: "/nieuws/:slug", statusCode: 301 },
    { source: "/blog/:slug", destination: "/nieuws/:slug", statusCode: 301 },
    { source: "/brand/:slug([^/.]+)", destination: "/merken", statusCode: 301 },
    { source: "/winkel/:path*", destination: "/shop", statusCode: 301 },
    { source: "/my-account/:path*", destination: "/account", statusCode: 301 },
    { source: "/mijn-account/:path*", destination: "/account", statusCode: 301 },
  ];

  const seen = new Set(exact.map((row) => row.source));
  const extra = patterns.filter((row) => !seen.has(row.source));
  return [...exact, ...extra];
}
