import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { cache } from "react";
import { revalidatePath, revalidateTag } from "next/cache";

import { requirePrisma } from "@/lib/database";
import { hydratePageTranslations } from "@/lib/i18n/hydrate";
import { compactLocaleMap } from "@/lib/i18n/translations";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale-codes";
import type { HomepageBlocks, SitePageRow, SitePageUpdateInput } from "@/lib/site-pages";

function rowToPage(row: {
  id: number;
  slug: string;
  path: string;
  title: string;
  heading: string | null;
  bodyHtml: string;
  blocks: Prisma.JsonValue | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  socialImage: string | null;
  imageAlt: string | null;
  noindex: boolean;
  isPublished: boolean;
  sortOrder: number;
  updatedAt: Date;
  translations?: Prisma.JsonValue | null;
}): SitePageRow {
  return {
    id: row.id,
    slug: row.slug,
    path: row.path,
    title: row.title,
    heading: row.heading,
    body_html: row.bodyHtml,
    blocks: (row.blocks as HomepageBlocks | null) ?? null,
    meta_title: row.metaTitle,
    meta_description: row.metaDescription,
    og_title: row.ogTitle,
    og_description: row.ogDescription,
    social_image: row.socialImage,
    image_alt: row.imageAlt,
    noindex: row.noindex,
    is_published: row.isPublished,
    sort_order: row.sortOrder,
    updated_at: row.updatedAt.toISOString(),
    translations: hydratePageTranslations({
      title: row.title,
      heading: row.heading,
      slug: row.slug,
      path: row.path,
      body_html: row.bodyHtml,
      blocks: (row.blocks as HomepageBlocks | null) ?? null,
      meta_title: row.metaTitle,
      meta_description: row.metaDescription,
      og_title: row.ogTitle,
      og_description: row.ogDescription,
      image_alt: row.imageAlt,
      translations: row.translations,
    }),
  };
}

export async function listSitePages(): Promise<SitePageRow[]> {
  const prisma = requirePrisma();
  const rows = await prisma.sitePage.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map(rowToPage);
}

export async function getSitePageById(id: number): Promise<SitePageRow | null> {
  const prisma = requirePrisma();
  const row = await prisma.sitePage.findUnique({ where: { id } });
  return row ? rowToPage(row) : null;
}

async function fetchPublishedPageByPath(path: string): Promise<SitePageRow | null> {
  const prisma = requirePrisma();
  const row = await prisma.sitePage.findFirst({
    where: { path, isPublished: true },
  });
  return row ? rowToPage(row) : null;
}

/** Per-request dedupe only — geen cross-request cache, zodat CMS-wijzigingen direct zichtbaar zijn. */
export const getPublishedPageByPath = cache(async (path: string): Promise<SitePageRow | null> => {
  return fetchPublishedPageByPath(path);
});


export async function updateSitePage(id: number, input: SitePageUpdateInput): Promise<SitePageRow> {
  const prisma = requirePrisma();
  const existing = await getSitePageById(id);
  if (!existing) {
    throw new Error("Page not found.");
  }

  const translations = compactLocaleMap(
    hydratePageTranslations({
      ...existing,
      title: input.title,
      heading: input.heading,
      body_html: input.body_html ?? existing.body_html,
      blocks: input.blocks ?? existing.blocks,
      meta_title: input.meta_title,
      meta_description: input.meta_description,
      og_title: input.og_title,
      og_description: input.og_description,
      image_alt: input.image_alt,
      translations: input.translations ?? existing.translations,
    }),
  );
  const nl = translations[DEFAULT_LOCALE] ?? {};

  const data = await prisma.sitePage.update({
    where: { id },
    data: {
      title: (nl.title || input.title).trim(),
      heading: (nl.heading || input.heading)?.trim() || null,
      bodyHtml: nl.bodyHtml ?? input.body_html ?? "",
      blocks: (nl.blocks ?? input.blocks ?? null) as Prisma.InputJsonValue,
      metaTitle: (nl.metaTitle || input.meta_title)?.trim() || null,
      metaDescription: (nl.metaDescription || input.meta_description)?.trim() || null,
      ogTitle: (nl.ogTitle || input.og_title)?.trim() || null,
      ogDescription: (nl.ogDescription || input.og_description)?.trim() || null,
      socialImage: input.social_image?.trim() || null,
      imageAlt: (nl.imageAlt || input.image_alt)?.trim() || null,
      noindex: Boolean(input.noindex),
      isPublished: input.is_published ?? true,
      translations: translations as Prisma.InputJsonValue,
    },
  });

  invalidatePageCache(existing.path);
  if (existing.slug === "home") {
    revalidatePath("/");
  }

  return rowToPage(data);
}

function invalidatePageCache(path: string) {
  revalidatePath(path);
  revalidateTag(`site-page:${path}`, "max");
  if (path !== "/") {
    revalidatePath("/");
  }
}

export async function upsertSitePageSeed(row: {
  slug: string;
  path: string;
  title: string;
  heading?: string;
  body_html?: string;
  blocks?: HomepageBlocks | null;
  sort_order: number;
  meta_title?: string;
  meta_description?: string;
}): Promise<void> {
  const prisma = requirePrisma();
  await prisma.sitePage.upsert({
    where: { slug: row.slug },
    create: {
      slug: row.slug,
      path: row.path,
      title: row.title,
      heading: row.heading ?? null,
      bodyHtml: row.body_html ?? "",
      blocks: (row.blocks ?? null) as Prisma.InputJsonValue,
      metaTitle: row.meta_title ?? null,
      metaDescription: row.meta_description ?? null,
      isPublished: true,
      sortOrder: row.sort_order,
    },
    update: {
      path: row.path,
      title: row.title,
      heading: row.heading ?? null,
      bodyHtml: row.body_html ?? "",
      blocks: (row.blocks ?? null) as Prisma.InputJsonValue,
      metaTitle: row.meta_title ?? null,
      metaDescription: row.meta_description ?? null,
      isPublished: true,
      sortOrder: row.sort_order,
    },
  });
}

export async function createSitePage(input: {
  title: string;
  slug: string;
  path: string;
  heading?: string | null;
  body_html?: string;
  meta_title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  social_image?: string | null;
  image_alt?: string | null;
  noindex?: boolean;
  is_published?: boolean;
}): Promise<SitePageRow> {
  const prisma = requirePrisma();
  const title = input.title.trim();
  const created = await prisma.sitePage.create({
    data: {
      slug: input.slug,
      path: input.path.startsWith("/") ? input.path : `/${input.path}`,
      title,
      heading: input.heading?.trim() || title,
      bodyHtml: input.body_html ?? "",
      metaTitle: input.meta_title?.trim() || null,
      metaDescription: input.meta_description?.trim() || null,
      ogTitle: input.og_title?.trim() || null,
      ogDescription: input.og_description?.trim() || null,
      socialImage: input.social_image?.trim() || null,
      imageAlt: input.image_alt?.trim() || null,
      noindex: Boolean(input.noindex),
      isPublished: input.is_published ?? false,
      sortOrder: 100,
    },
  });
  invalidatePageCache(created.path);
  return rowToPage(created);
}
