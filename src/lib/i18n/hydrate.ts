import { DEFAULT_LOCALE } from "@/lib/i18n/locale-codes";
import {
  overlayTranslation,
  parseLocaleMap,
  pickTranslation,
  type CategoryLocaleFields,
  type EmailLocaleFields,
  type LocaleMap,
  type NewsLocaleFields,
  type PageLocaleFields,
} from "@/lib/i18n/translations";
import type { HomepageBlocks } from "@/lib/site-pages";

export function hydrateCategoryTranslations(row: {
  name: string;
  slug: string;
  seoIntro?: string | null;
  seoFooterHtml?: string | null;
  seoMetaTitle?: string | null;
  seoMetaDescription?: string | null;
  translations?: unknown;
}): LocaleMap<CategoryLocaleFields> {
  const existing = parseLocaleMap<CategoryLocaleFields>(row.translations);
  const fromColumns: CategoryLocaleFields = {
    name: row.name,
    slug: row.slug,
    description: row.seoIntro ?? "",
    seoFooterHtml: row.seoFooterHtml ?? "",
    seoTitle: row.seoMetaTitle ?? "",
    seoDescription: row.seoMetaDescription ?? "",
  };
  return { ...existing, [DEFAULT_LOCALE]: { ...fromColumns, ...existing[DEFAULT_LOCALE] } };
}

export function hydratePageTranslations(row: {
  title: string;
  heading?: string | null;
  slug: string;
  path: string;
  body_html: string;
  blocks?: HomepageBlocks | null;
  meta_title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  image_alt?: string | null;
  translations?: unknown;
}): LocaleMap<PageLocaleFields> {
  const existing = parseLocaleMap<PageLocaleFields>(row.translations);
  const fromColumns: PageLocaleFields = {
    title: row.title,
    heading: row.heading ?? "",
    slug: row.slug,
    path: row.path,
    bodyHtml: row.body_html,
    blocks: row.blocks,
    metaTitle: row.meta_title ?? "",
    metaDescription: row.meta_description ?? "",
    ogTitle: row.og_title ?? "",
    ogDescription: row.og_description ?? "",
    imageAlt: row.image_alt ?? "",
  };
  return { ...existing, [DEFAULT_LOCALE]: { ...fromColumns, ...existing[DEFAULT_LOCALE] } };
}

export function hydrateNewsTranslations(row: {
  title: string;
  slug: string;
  excerpt?: string | null;
  bodyHtml: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  imageAlt?: string | null;
  titleEn?: string | null;
  slugEn?: string | null;
  excerptEn?: string | null;
  bodyHtmlEn?: string | null;
  translations?: unknown;
}): LocaleMap<NewsLocaleFields> {
  const existing = parseLocaleMap<NewsLocaleFields>(row.translations);
  const nl: NewsLocaleFields = {
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? "",
    bodyHtml: row.bodyHtml,
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    ogTitle: row.ogTitle ?? "",
    ogDescription: row.ogDescription ?? "",
    imageAlt: row.imageAlt ?? "",
    ...existing[DEFAULT_LOCALE],
  };
  const enFromColumns: NewsLocaleFields = {
    title: row.titleEn ?? "",
    slug: row.slugEn ?? "",
    excerpt: row.excerptEn ?? "",
    bodyHtml: row.bodyHtmlEn ?? "",
  };
  const en = { ...enFromColumns, ...existing.en };
  const map: LocaleMap<NewsLocaleFields> = { ...existing, [DEFAULT_LOCALE]: nl };
  if (en.title || en.slug || en.bodyHtml || en.excerpt) {
    map.en = en;
  }
  return map;
}

export function hydrateEmailTranslations(row: {
  subject: string;
  title: string;
  bodyHtml: string;
  translations?: unknown;
}): LocaleMap<EmailLocaleFields> {
  const existing = parseLocaleMap<EmailLocaleFields>(row.translations);
  const fromColumns: EmailLocaleFields = {
    subject: row.subject,
    title: row.title,
    bodyHtml: row.bodyHtml,
  };
  return { ...existing, [DEFAULT_LOCALE]: { ...fromColumns, ...existing[DEFAULT_LOCALE] } };
}

export function localizeCategoryFields(
  row: { name: string; slug: string; translations?: unknown },
  locale: string,
): CategoryLocaleFields {
  const map = parseLocaleMap<CategoryLocaleFields>(row.translations);
  const overlay = pickTranslation(map, locale);
  return overlayTranslation({ name: row.name, slug: row.slug }, overlay);
}
