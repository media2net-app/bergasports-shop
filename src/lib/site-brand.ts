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

/** Header / e-mail logo (400×39, wit op zwart — past op donkere topbar). */
export const SITE_LOGO_SRC = "/brand/bergasports-logo.png";
export const SITE_LOGO_WIDTH = 400;
export const SITE_LOGO_HEIGHT = 39;

/** Homepage hero achtergrond (winkel + Cipollini). */
export const HOME_HERO_IMAGE_SRC = "/images/hero-storefront.jpg";

export function siteLogoAbsoluteUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_DEFAULT_URL).replace(/\/$/, "");
  return `${base}${SITE_LOGO_SRC}`;
}

/** Logo in transactional e-mail (env override, anders absolute URL). */
export function resolveSiteEmailLogoUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_EMAIL_LOGO_URL?.trim() || process.env.EMAIL_LOGO_URL?.trim();
  return fromEnv || siteLogoAbsoluteUrl();
}
