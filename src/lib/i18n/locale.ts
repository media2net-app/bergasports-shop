import "server-only";

import { headers } from "next/headers";

import { DEFAULT_LOCALE } from "@/lib/i18n/locale-codes";
import { localizedHref, localeFromHost, type AppLocale } from "@/lib/i18n/locale-shared";
import { getDefaultShopLocale } from "@/lib/i18n/shop-languages";

export type { AppLocale };
export {
  languageAlternateUrl,
  localeFromHost,
  mapPathToLocale,
  peerDomainForLocale,
} from "@/lib/i18n/locale-shared";

export async function getRequestLocale(): Promise<AppLocale> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const forced = h.get("x-bergasports-locale")?.toLowerCase();
  if (forced && /^[a-z]{2}$/.test(forced)) return forced;
  return localeFromHost(host);
}

/** Storefront path with the active locale prefix (NL stays unprefixed). */
export async function localizedPublicPath(pathname: string): Promise<string> {
  const [locale, defaultLocale] = await Promise.all([
    getRequestLocale(),
    getDefaultShopLocale().catch(() => DEFAULT_LOCALE),
  ]);
  return localizedHref(pathname, locale, defaultLocale);
}
