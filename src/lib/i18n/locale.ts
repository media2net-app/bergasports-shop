import "server-only";

import { headers } from "next/headers";

import { localeFromHost, localizedHref, type AppLocale } from "@/lib/i18n/locale-shared";

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

/** Storefront path without locale prefix (.nl/.com delen dezelfde URLs). */
export async function localizedPublicPath(pathname: string): Promise<string> {
  return localizedHref(pathname);
}
