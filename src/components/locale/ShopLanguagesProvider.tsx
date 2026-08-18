"use client";

import { createContext, useCallback, useContext } from "react";

import { DEFAULT_LOCALE } from "@/lib/i18n/locale-codes";
import { localizedHref } from "@/lib/i18n/locale-shared";
import { FALLBACK_NL, type ShopLanguage } from "@/lib/i18n/shop-language-types";

type ShopLanguagesContextValue = {
  languages: ShopLanguage[];
  locale: string;
  defaultLocale: string;
};

const ShopLanguagesContext = createContext<ShopLanguagesContextValue>({
  languages: [FALLBACK_NL],
  locale: DEFAULT_LOCALE,
  defaultLocale: DEFAULT_LOCALE,
});

export function ShopLanguagesProvider({
  languages,
  locale,
  children,
}: {
  languages: ShopLanguage[];
  locale: string;
  children: React.ReactNode;
}) {
  const rows = languages.length ? languages : [FALLBACK_NL];
  const defaultLocale = rows.find((row) => row.isDefault)?.code ?? DEFAULT_LOCALE;
  return (
    <ShopLanguagesContext.Provider
      value={{
        languages: rows,
        locale: locale || defaultLocale,
        defaultLocale,
      }}
    >
      {children}
    </ShopLanguagesContext.Provider>
  );
}

export function useShopLanguages(): ShopLanguage[] {
  return useContext(ShopLanguagesContext).languages;
}

export function useShopLocale() {
  const ctx = useContext(ShopLanguagesContext);
  return { locale: ctx.locale, defaultLocale: ctx.defaultLocale, languages: ctx.languages };
}

export function useLocalizedHref() {
  const { locale, defaultLocale } = useShopLocale();
  return useCallback(
    (href: string) => localizedHref(href, locale, defaultLocale),
    [locale, defaultLocale],
  );
}
