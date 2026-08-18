import "server-only";

import { getPrisma } from "@/lib/prisma";
import { slugifyNl } from "@/lib/slugify";
import { hydrateNewsTranslations } from "@/lib/i18n/hydrate";
import { compactLocaleMap, type LocaleMap, type NewsLocaleFields } from "@/lib/i18n/translations";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale-codes";
import type { Prisma } from "@/generated/prisma/client";

export type NewsPostRow = {
  id: string;
  slug: string;
  slugEn: string | null;
  title: string;
  titleEn: string | null;
  excerpt: string | null;
  excerptEn: string | null;
  bodyHtml: string;
  bodyHtmlEn: string | null;
  coverImage: string | null;
  category: string | null;
  publishedAt: Date | null;
  isPublished: boolean;
  relatedProductIds: unknown;
  sourceUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  socialImage: string | null;
  imageAlt: string | null;
  noindex: boolean;
  translations: LocaleMap<NewsLocaleFields>;
};

export type NewsPostInput = {
  slug?: string;
  title: string;
  excerpt?: string | null;
  bodyHtml: string;
  coverImage?: string | null;
  category?: string | null;
  publishedAt?: Date | string | null;
  isPublished?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  socialImage?: string | null;
  imageAlt?: string | null;
  noindex?: boolean;
  translations?: LocaleMap<NewsLocaleFields>;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function prismaClient() {
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL ontbreekt");
  return prisma;
}

function mapNewsRow(row: {
  id: string;
  slug: string;
  slugEn: string | null;
  title: string;
  titleEn: string | null;
  excerpt: string | null;
  excerptEn: string | null;
  bodyHtml: string;
  bodyHtmlEn: string | null;
  coverImage: string | null;
  category: string | null;
  publishedAt: Date | null;
  isPublished: boolean;
  relatedProductIds: unknown;
  sourceUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  socialImage: string | null;
  imageAlt: string | null;
  noindex: boolean;
  translations?: unknown;
}): NewsPostRow {
  return {
    id: row.id,
    slug: row.slug,
    slugEn: row.slugEn,
    title: row.title,
    titleEn: row.titleEn,
    excerpt: row.excerpt,
    excerptEn: row.excerptEn,
    bodyHtml: row.bodyHtml,
    bodyHtmlEn: row.bodyHtmlEn,
    coverImage: row.coverImage,
    category: row.category,
    publishedAt: row.publishedAt,
    isPublished: row.isPublished,
    relatedProductIds: row.relatedProductIds,
    sourceUrl: row.sourceUrl,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    ogTitle: row.ogTitle,
    ogDescription: row.ogDescription,
    socialImage: row.socialImage,
    imageAlt: row.imageAlt,
    noindex: row.noindex,
    translations: hydrateNewsTranslations(row),
  };
}

function newsCopyFromInput(input: NewsPostInput) {
  const translations = compactLocaleMap(
    hydrateNewsTranslations({
      title: input.title,
      slug: input.slug ?? "",
      excerpt: input.excerpt,
      bodyHtml: input.bodyHtml,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      ogTitle: input.ogTitle,
      ogDescription: input.ogDescription,
      imageAlt: input.imageAlt,
      translations: input.translations,
    }),
  );
  const nl = translations[DEFAULT_LOCALE] ?? {};
  const en = translations.en ?? {};
  return {
    translations,
    title: (nl.title || input.title).trim(),
    excerpt: (nl.excerpt || input.excerpt)?.trim() || null,
    bodyHtml: nl.bodyHtml || input.bodyHtml,
    seoTitle: (nl.seoTitle || input.seoTitle)?.trim() || null,
    seoDescription: (nl.seoDescription || input.seoDescription)?.trim() || null,
    ogTitle: (nl.ogTitle || input.ogTitle)?.trim() || null,
    ogDescription: (nl.ogDescription || input.ogDescription)?.trim() || null,
    imageAlt: (nl.imageAlt || input.imageAlt)?.trim() || null,
    titleEn: en.title?.trim() || null,
    slugEn: en.slug?.trim() || null,
    excerptEn: en.excerpt?.trim() || null,
    bodyHtmlEn: en.bodyHtml?.trim() || null,
  };
}

export async function loadLatestNewsPosts(limit = 3): Promise<NewsPostRow[]> {
  const prisma = getPrisma();
  if (!prisma) return [];
  try {
    return (await prisma.newsPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      take: limit,
    })).map(mapNewsRow);
  } catch {
    return [];
  }
}

export async function loadNewsPosts(options?: {
  category?: string;
  limit?: number;
}): Promise<NewsPostRow[]> {
  const prisma = getPrisma();
  if (!prisma) return [];
  try {
    return (await prisma.newsPost.findMany({
      where: {
        isPublished: true,
        ...(options?.category ? { category: options.category } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: options?.limit ?? 50,
    })).map(mapNewsRow);
  } catch {
    return [];
  }
}

export async function loadAdminNewsPosts(): Promise<NewsPostRow[]> {
  const prisma = getPrisma();
  if (!prisma) return [];
  return (await prisma.newsPost.findMany({
    orderBy: [{ isPublished: "desc" }, { publishedAt: "desc" }, { updatedAt: "desc" }],
  })).map(mapNewsRow);
}

export async function loadNewsPostById(id: string): Promise<NewsPostRow | null> {
  const prisma = getPrisma();
  if (!prisma) return null;
  const row = await prisma.newsPost.findUnique({ where: { id } });
  return row ? mapNewsRow(row) : null;
}

export async function loadNewsPostBySlug(slug: string): Promise<NewsPostRow | null> {
  const prisma = getPrisma();
  if (!prisma) return null;
  try {
    const row = await prisma.newsPost.findFirst({
      where: {
        isPublished: true,
        OR: [{ slug }, { slugEn: slug }],
      },
    });
    if (row) return mapNewsRow(row);
    const published = await prisma.newsPost.findMany({ where: { isPublished: true } });
    const match = published.find((item) =>
      Object.values(hydrateNewsTranslations(item)).some((fields) => fields.slug?.trim() === slug),
    );
    return match ? mapNewsRow(match) : null;
  } catch {
    return null;
  }
}

export async function createNewsPost(input: NewsPostInput): Promise<NewsPostRow> {
  const prisma = prismaClient();
  const copy = newsCopyFromInput(input);
  const base = slugifyNl(copy.translations[DEFAULT_LOCALE]?.slug || input.slug || copy.title) || `bericht-${Date.now()}`;
  let slug = base;
  let n = 2;
  while (await prisma.newsPost.findUnique({ where: { slug } })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  const published = input.isPublished ?? false;
  const row = await prisma.newsPost.create({
    data: {
      slug,
      title: copy.title,
      excerpt: copy.excerpt,
      bodyHtml: copy.bodyHtml,
      coverImage: input.coverImage?.trim() || null,
      category: input.category?.trim() || null,
      publishedAt: published ? (toDate(input.publishedAt) ?? new Date()) : toDate(input.publishedAt),
      isPublished: published,
      seoTitle: copy.seoTitle,
      seoDescription: copy.seoDescription,
      ogTitle: copy.ogTitle,
      ogDescription: copy.ogDescription,
      socialImage: input.socialImage?.trim() || null,
      imageAlt: copy.imageAlt,
      noindex: Boolean(input.noindex),
      titleEn: copy.titleEn,
      slugEn: copy.slugEn,
      excerptEn: copy.excerptEn,
      bodyHtmlEn: copy.bodyHtmlEn,
      translations: copy.translations as Prisma.InputJsonValue,
    },
  });
  return mapNewsRow(row);
}

export async function updateNewsPost(id: string, input: NewsPostInput): Promise<NewsPostRow> {
  const prisma = prismaClient();
  const existing = await prisma.newsPost.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Bericht niet gevonden.");
  }
  const copy = newsCopyFromInput({ ...input, translations: input.translations ?? hydrateNewsTranslations(existing) });
  let slug = slugifyNl(copy.translations[DEFAULT_LOCALE]?.slug || input.slug || copy.title) || existing.slug;
  if (slug !== existing.slug) {
    const clash = await prisma.newsPost.findUnique({ where: { slug } });
    if (clash && clash.id !== id) {
      slug = `${slug}-${id.slice(-4)}`;
    }
  }
  const published = input.isPublished ?? existing.isPublished;
  const row = await prisma.newsPost.update({
    where: { id },
    data: {
      slug,
      title: copy.title,
      excerpt: copy.excerpt,
      bodyHtml: copy.bodyHtml,
      coverImage: input.coverImage?.trim() || null,
      category: input.category?.trim() || null,
      publishedAt: published
        ? (toDate(input.publishedAt) ?? existing.publishedAt ?? new Date())
        : toDate(input.publishedAt) ?? existing.publishedAt,
      isPublished: published,
      seoTitle: copy.seoTitle,
      seoDescription: copy.seoDescription,
      ogTitle: copy.ogTitle,
      ogDescription: copy.ogDescription,
      socialImage: input.socialImage?.trim() || null,
      imageAlt: copy.imageAlt,
      noindex: Boolean(input.noindex),
      titleEn: copy.titleEn,
      slugEn: copy.slugEn,
      excerptEn: copy.excerptEn,
      bodyHtmlEn: copy.bodyHtmlEn,
      translations: copy.translations as Prisma.InputJsonValue,
    },
  });
  return mapNewsRow(row);
}

export async function deleteNewsPost(id: string): Promise<void> {
  const prisma = prismaClient();
  await prisma.newsPost.delete({ where: { id } });
}

export async function upsertNewsPost(input: {
  slug: string;
  title: string;
  excerpt?: string | null;
  bodyHtml: string;
  coverImage?: string | null;
  category?: string | null;
  publishedAt?: Date | null;
  sourceUrl?: string | null;
  isPublished?: boolean;
}): Promise<void> {
  const prisma = prismaClient();
  await prisma.newsPost.upsert({
    where: { slug: input.slug },
    create: {
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt ?? null,
      bodyHtml: input.bodyHtml,
      coverImage: input.coverImage ?? null,
      category: input.category ?? null,
      publishedAt: input.publishedAt ?? new Date(),
      sourceUrl: input.sourceUrl ?? null,
      isPublished: input.isPublished ?? true,
    },
    update: {
      title: input.title,
      excerpt: input.excerpt ?? null,
      bodyHtml: input.bodyHtml,
      coverImage: input.coverImage ?? null,
      category: input.category ?? null,
      publishedAt: input.publishedAt ?? undefined,
      sourceUrl: input.sourceUrl ?? null,
      isPublished: input.isPublished ?? true,
    },
  });
}
