"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DEFAULT_LOCALE } from "@/lib/i18n/locale-codes";
import { FALLBACK_NL, type ShopLanguage } from "@/lib/i18n/shop-language-types";
import {
  compactLocaleMap,
  filledLocales,
  parseLocaleMap,
  setLocaleFields,
  type LocaleMap,
} from "@/lib/i18n/translations";

export function useAdminLocales() {
  const [languages, setLanguages] = useState<ShopLanguage[]>([FALLBACK_NL]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/languages");
        const data = (await res.json()) as { languages?: ShopLanguage[] };
        if (!cancelled && Array.isArray(data.languages) && data.languages.length) {
          setLanguages(data.languages);
        }
      } catch {
        /* keep fallback */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enabled = useMemo(
    () => languages.filter((row) => row.enabled).sort((a, b) => a.sortOrder - b.sortOrder),
    [languages],
  );
  const defaultLocale = enabled.find((row) => row.isDefault)?.code ?? DEFAULT_LOCALE;

  return { languages: enabled, allLanguages: languages, defaultLocale, loaded };
}

export function useLocaleDraft<T extends object>(initial: LocaleMap<T> | unknown) {
  const { languages, defaultLocale, loaded } = useAdminLocales();
  const [locale, setLocale] = useState(defaultLocale);
  const [map, setMap] = useState<LocaleMap<T>>(() => parseLocaleMap<T>(initial));
  const activeLocale = languages.some((row) => row.code === locale) ? locale : defaultLocale;

  const fields = (map[activeLocale] ?? {}) as T;

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setMap((prev) => setLocaleFields(prev, activeLocale, { [key]: value } as unknown as Partial<T>));
  }, [activeLocale]);

  const patchFields = useCallback((patch: Partial<T>) => {
    setMap((prev) => setLocaleFields(prev, activeLocale, patch));
  }, [activeLocale]);

  return {
    locale: activeLocale,
    setLocale,
    languages,
    defaultLocale,
    map,
    setMap,
    fields,
    setField,
    patchFields,
    filled: filledLocales(map),
    compact: () => compactLocaleMap(map, defaultLocale),
    loaded,
  };
}
