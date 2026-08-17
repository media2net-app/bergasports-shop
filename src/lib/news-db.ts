import "server-only";

import { getPrisma } from "@/lib/prisma";
import { slugifyNl } from "@/lib/slugify";

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

export async function loadLatestNewsPosts(limit = 3): Promise<NewsPostRow[]> {
  const prisma = getPrisma();
  if (!prisma) return [];
  try {
    return await prisma.newsPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      take: limit,
    });
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
    return await prisma.newsPost.findMany({
      where: {
        isPublished: true,
        ...(options?.category ? { category: options.category } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: options?.limit ?? 50,
    });
  } catch {
    return [];
  }
}

export async function loadAdminNewsPosts(): Promise<NewsPostRow[]> {
  const prisma = getPrisma();
  if (!prisma) return [];
  return prisma.newsPost.findMany({
    orderBy: [{ isPublished: "desc" }, { publishedAt: "desc" }, { updatedAt: "desc" }],
  });
}

export async function loadNewsPostById(id: string): Promise<NewsPostRow | null> {
  const prisma = getPrisma();
  if (!prisma) return null;
  return prisma.newsPost.findUnique({ where: { id } });
}

export async function loadNewsPostBySlug(slug: string): Promise<NewsPostRow | null> {
  const prisma = getPrisma();
  if (!prisma) return null;
  try {
    return await prisma.newsPost.findFirst({
      where: {
        isPublished: true,
        OR: [{ slug }, { slugEn: slug }],
      },
    });
  } catch {
    return null;
  }
}

export async function createNewsPost(input: NewsPostInput): Promise<NewsPostRow> {
  const prisma = prismaClient();
  const base = slugifyNl(input.slug || input.title) || `bericht-${Date.now()}`;
  let slug = base;
  let n = 2;
  while (await prisma.newsPost.findUnique({ where: { slug } })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  const published = input.isPublished ?? false;
  return prisma.newsPost.create({
    data: {
      slug,
      title: input.title.trim(),
      excerpt: input.excerpt?.trim() || null,
      bodyHtml: input.bodyHtml,
      coverImage: input.coverImage?.trim() || null,
      category: input.category?.trim() || null,
      publishedAt: published ? (toDate(input.publishedAt) ?? new Date()) : toDate(input.publishedAt),
      isPublished: published,
      seoTitle: input.seoTitle?.trim() || null,
      seoDescription: input.seoDescription?.trim() || null,
      ogTitle: input.ogTitle?.trim() || null,
      ogDescription: input.ogDescription?.trim() || null,
      socialImage: input.socialImage?.trim() || null,
      imageAlt: input.imageAlt?.trim() || null,
      noindex: Boolean(input.noindex),
    },
  });
}

export async function updateNewsPost(id: string, input: NewsPostInput): Promise<NewsPostRow> {
  const prisma = prismaClient();
  const existing = await prisma.newsPost.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Bericht niet gevonden.");
  }
  let slug = slugifyNl(input.slug || input.title) || existing.slug;
  if (slug !== existing.slug) {
    const clash = await prisma.newsPost.findUnique({ where: { slug } });
    if (clash && clash.id !== id) {
      slug = `${slug}-${id.slice(-4)}`;
    }
  }
  const published = input.isPublished ?? existing.isPublished;
  return prisma.newsPost.update({
    where: { id },
    data: {
      slug,
      title: input.title.trim(),
      excerpt: input.excerpt?.trim() || null,
      bodyHtml: input.bodyHtml,
      coverImage: input.coverImage?.trim() || null,
      category: input.category?.trim() || null,
      publishedAt: published
        ? (toDate(input.publishedAt) ?? existing.publishedAt ?? new Date())
        : toDate(input.publishedAt) ?? existing.publishedAt,
      isPublished: published,
      seoTitle: input.seoTitle?.trim() || null,
      seoDescription: input.seoDescription?.trim() || null,
      ogTitle: input.ogTitle?.trim() || null,
      ogDescription: input.ogDescription?.trim() || null,
      socialImage: input.socialImage?.trim() || null,
      imageAlt: input.imageAlt?.trim() || null,
      noindex: Boolean(input.noindex),
    },
  });
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
