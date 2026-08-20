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

/**
 * Inline logo for SMTP (nodemailer CID). Prefer this at send-time because
 * `www.bergasports.com` may still be WordPress (logo 404) and localhost is
 * unreachable from Gmail/Outlook. Absolute https via NEXT_PUBLIC_EMAIL_LOGO_URL
 * remains fine for admin HTML previews in the browser.
 */
export const EMAIL_LOGO_CID = "bergasports-logo";
export const EMAIL_LOGO_CID_SRC = `cid:${EMAIL_LOGO_CID}`;

/** Homepage hero achtergrond (winkel + Cipollini). */
export const HOME_HERO_IMAGE_SRC = "/images/hero-storefront.jpg";

function isLocalhostUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\b/i.test(url);
}

/**
 * Public https origin for assets that must load outside the browser (e-mail clients).
 * Never uses localhost — mail clients cannot fetch `http://localhost:…/logo.png`.
 * Override with NEXT_PUBLIC_EMAIL_LOGO_URL for a CDN / dedicated logo URL.
 */
export function emailPublicBaseUrl(): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  if (site && /^https?:\/\//i.test(site) && !isLocalhostUrl(site)) {
    return site;
  }
  return SITE_DEFAULT_URL;
}

/** Absolute logo URL for the storefront (may be localhost in local .env). */
export function siteLogoAbsoluteUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_DEFAULT_URL).replace(/\/$/, "");
  return `${base}${SITE_LOGO_SRC}`;
}

/**
 * Normalize a candidate logo URL for HTML e-mail `<img src>`.
 * - Rejects localhost / file: (invisible in Gmail, Outlook, Apple Mail, …)
 * - Turns relative `/…` paths into absolute https via {@link emailPublicBaseUrl}
 * - Rewrites the old `/brand/bergasports-logo.*` path that Vercel redirected away
 */
export function usableEmailLogoUrl(url: string | undefined | null): string {
  const raw = url?.trim() ?? "";
  if (!raw) return "";
  // nodemailer / MIME inline image (attached at SMTP send)
  if (/^cid:[A-Za-z0-9._-]+$/i.test(raw)) return raw;
  if (raw.startsWith("file:") || isLocalhostUrl(raw)) return "";

  // Relative path → public absolute URL (relative src never works in e-mail clients).
  if (raw.startsWith("/")) {
    if (/^\/brand\/bergasports-logo\.(png|svg)$/i.test(raw)) {
      return `${emailPublicBaseUrl()}${SITE_LOGO_SRC}`;
    }
    return `${emailPublicBaseUrl()}${raw}`;
  }

  if (!/^https?:\/\//i.test(raw)) return "";

  const path = raw.replace(/^https?:\/\/[^/]+/i, "") || "/";
  if (/^\/brand\/bergasports-logo\.(png|svg)$/i.test(path)) {
    return `${emailPublicBaseUrl()}${SITE_LOGO_SRC}`;
  }
  return raw;
}

/**
 * Logo for transactional / marketing / newsletter e-mail.
 * Priority: NEXT_PUBLIC_EMAIL_LOGO_URL or EMAIL_LOGO_URL (absolute https) →
 * else `{emailPublicBaseUrl}/bergasports-logo.png` (production by default when SITE_URL is local).
 */
export function resolveSiteEmailLogoUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_EMAIL_LOGO_URL?.trim() || process.env.EMAIL_LOGO_URL?.trim();
  return usableEmailLogoUrl(fromEnv) || `${emailPublicBaseUrl()}${SITE_LOGO_SRC}`;
}
