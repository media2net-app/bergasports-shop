import { getRequestLocale } from "@/lib/i18n/locale";
import {
  parseLocaleMap,
  pickTranslation,
  type PageLocaleFields,
} from "@/lib/i18n/translations";

/** Minimal CMS page shape for locale overlays (seed fallbacks + DB rows). */
export type LocalizablePage = {
  title: string;
  heading?: string | null;
  body_html: string;
  image_alt?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  translations?: unknown;
  path?: string;
  social_image?: string | null;
  noindex?: boolean | null;
};

/** Apply `translations[locale]` overlays onto a published/seed CMS page. */
export function localizePageFields<T extends LocalizablePage>(page: T, locale: string): T {
  const overlay = pickTranslation<PageLocaleFields>(
    parseLocaleMap<PageLocaleFields>(page.translations),
    locale,
  );
  if (!overlay) return page;
  return {
    ...page,
    title: overlay.title?.trim() || page.title,
    heading: overlay.heading?.trim() || page.heading,
    body_html: overlay.bodyHtml?.trim() || page.body_html,
    image_alt: overlay.imageAlt?.trim() || page.image_alt,
    meta_title: overlay.metaTitle?.trim() || page.meta_title,
    meta_description: overlay.metaDescription?.trim() || page.meta_description,
    og_title: overlay.ogTitle?.trim() || page.og_title,
    og_description: overlay.ogDescription?.trim() || page.og_description,
  };
}

export async function localizePageForRequest<T extends LocalizablePage>(page: T): Promise<T> {
  const locale = await getRequestLocale();
  return localizePageFields(page, locale);
}
