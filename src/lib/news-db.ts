import "server-only";

import { getPrisma } from "@/lib/prisma";

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
};

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
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL ontbreekt");
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
