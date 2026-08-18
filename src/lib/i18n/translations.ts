import { DEFAULT_LOCALE, isLocaleCode } from "@/lib/i18n/locale-codes";
import type { HomepageBlocks } from "@/lib/site-pages";

export type LocaleMap<T> = Record<string, T>;

export type ProductLocaleFields = {
  name?: string;
  slug?: string;
  shortDescriptionHtml?: string;
  descriptionHtml?: string;
  specsText?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  imageAlt?: string;
};

export type CategoryLocaleFields = {
  name?: string;
  slug?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoFooterHtml?: string;
};

export type PageLocaleFields = {
  title?: string;
  heading?: string;
  slug?: string;
  path?: string;
  bodyHtml?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  imageAlt?: string;
  blocks?: HomepageBlocks | null;
};

export type NewsLocaleFields = {
  title?: string;
  slug?: string;
  excerpt?: string;
  bodyHtml?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  imageAlt?: string;
};

export type EmailLocaleFields = {
  subject?: string;
  title?: string;
  bodyHtml?: string;
};

export function parseLocaleMap<T extends object>(value: unknown): LocaleMap<T> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: LocaleMap<T> = {};
  for (const [code, fields] of Object.entries(value as Record<string, unknown>)) {
    if (!isLocaleCode(code)) continue;
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) continue;
    out[code] = fields as T;
  }
  return out;
}

export function pickTranslation<T extends object>(
  map: LocaleMap<T> | null | undefined,
  locale: string,
  fallback = DEFAULT_LOCALE,
): T | undefined {
  if (!map) return undefined;
  const wanted = map[locale];
  if (wanted && hasLocaleContent(wanted)) return wanted;
  if (locale !== fallback) {
    const fb = map[fallback];
    if (fb && hasLocaleContent(fb)) return fb;
  }
  return wanted ?? map[fallback];
}

export function overlayTranslation<T extends object>(base: T, overlay: T | undefined): T {
  if (!overlay) return base;
  const next = { ...base };
  for (const [key, value] of Object.entries(overlay) as [keyof T, T[keyof T]][]) {
    if (typeof value === "string") {
      if (value.trim()) next[key] = value;
      continue;
    }
    if (value != null) {
      next[key] = value;
    }
  }
  return next;
}

export function hasLocaleContent(fields: object | undefined | null): boolean {
  if (!fields) return false;
  return Object.values(fields).some((value) => {
    if (typeof value === "string") return value.trim().length > 0;
    if (value && typeof value === "object") return hasLocaleContent(value);
    return value != null;
  });
}

export function compactLocaleMap<T extends object>(map: LocaleMap<T>, keepLocale = DEFAULT_LOCALE): LocaleMap<T> {
  const out: LocaleMap<T> = {};
  for (const [code, fields] of Object.entries(map)) {
    if (code === keepLocale || hasLocaleContent(fields)) {
      out[code] = fields;
    }
  }
  return out;
}

export function filledLocales<T extends object>(map: LocaleMap<T>): string[] {
  return Object.keys(map).filter((code) => hasLocaleContent(map[code]));
}

export function setLocaleFields<T extends object>(
  map: LocaleMap<T>,
  locale: string,
  patch: Partial<T>,
): LocaleMap<T> {
  return {
    ...map,
    [locale]: { ...(map[locale] ?? ({} as T)), ...patch },
  };
}
