import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { cache } from "react";
import { revalidatePath, revalidateTag } from "next/cache";

import { requirePrisma } from "@/lib/database";
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
  isPublished: boolean;
  sortOrder: number;
  updatedAt: Date;
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
    is_published: row.isPublished,
    sort_order: row.sortOrder,
    updated_at: row.updatedAt.toISOString(),
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

  const data = await prisma.sitePage.update({
    where: { id },
    data: {
      title: input.title.trim(),
      heading: input.heading?.trim() || null,
      bodyHtml: input.body_html ?? "",
      blocks: (input.blocks ?? null) as Prisma.InputJsonValue,
      metaTitle: input.meta_title?.trim() || null,
      metaDescription: input.meta_description?.trim() || null,
      isPublished: input.is_published ?? true,
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
