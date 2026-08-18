/** Storefront branding (Bergasports — NL). */
export const SITE_BRAND_NAME = "Bergasports";
export const SITE_BRAND_SHORT = "Bergasports";
export const SITE_EMAIL = "info@bergasports.com";
export const SITE_SLOGAN = "Je sportpartner";
export const SITE_TAGLINE =
  "Exclusieve racefietsen en topservice — Colnago, Cipollini, Orbea, Scope, Nimbl en meer.";

/** Fallback when NEXT_PUBLIC_SITE_URL is unset (build, scripts, e-mail previews). */
export const SITE_DEFAULT_URL = "https://www.bergasports.com";

/** Standaard valuta voor de Bergasports-webshop. */
export const SITE_DEFAULT_CURRENCY = "EUR";

/**
 * Header / favicon / e-mail (400×39, wit op zwart — past op donkere topbar).
 * Niet onder `/brand/` — de WP-redirect `/brand/:slug` → `/merken` vangt `.png` daar af (lokaal
 * werkt next/image via disk, op Vercel niet).
 */
export const SITE_LOGO_SRC = "/bergasports-logo.png";
export const SITE_LOGO_WIDTH = 400;
export const SITE_LOGO_HEIGHT = 39;

/** Homepage hero achtergrond (winkel + Cipollini). */
export const HOME_HERO_IMAGE_SRC = "/images/hero-storefront.jpg";

export function siteLogoAbsoluteUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_DEFAULT_URL).replace(/\/$/, "");
  return `${base}${SITE_LOGO_SRC}`;
}

/** Skip localhost/file-URLs and rewrite the old `/brand/…` pad that Vercel redirected away. */
export function usableEmailLogoUrl(url: string | undefined | null): string {
  const raw = url?.trim() ?? "";
  if (!raw) return "";
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\b/i.test(raw)) return "";
  if (raw.startsWith("file:")) return "";
  const path = raw.replace(/^https?:\/\/[^/]+/i, "");
  if (/^\/brand\/bergasports-logo\.(png|svg)$/i.test(path)) {
    return siteLogoAbsoluteUrl();
  }
  return raw;
}

/** Logo in transactional e-mail (env override, anders absolute URL). */
export function resolveSiteEmailLogoUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_EMAIL_LOGO_URL?.trim() || process.env.EMAIL_LOGO_URL?.trim();
  return usableEmailLogoUrl(fromEnv) || siteLogoAbsoluteUrl();
}
