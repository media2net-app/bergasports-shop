import "server-only";

import { headers } from "next/headers";

import { localeFromHost, type AppLocale } from "@/lib/i18n/locale-shared";

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
  const forced = h.get("x-bergasports-locale");
  if (forced === "en" || forced === "nl") return forced;
  return localeFromHost(host);
}
