import "server-only";

import { permanentRedirect } from "next/navigation";

import { getPrisma } from "@/lib/prisma";
import { loadNewsPostBySlug } from "@/lib/news-db";
import { matchStaticSeoRedirect, normalizeRedirectPath } from "@/lib/seo-redirects-static";

export type SeoRedirectLookup = {
  destination: string;
  statusCode: number;
};

async function lookupDb(sourcePath: string): Promise<SeoRedirectLookup | null> {
  const prisma = getPrisma();
  if (!prisma) return null;
  try {
    const row = await prisma.seoRedirect.findFirst({
      where: { sourcePath, enabled: true },
      select: { destinationPath: true, statusCode: true },
    });
    if (!row) return null;
    return { destination: row.destinationPath, statusCode: row.statusCode };
  } catch {
    return null;
  }
}

export async function resolveWpQueryRedirect(query: {
  p?: string | string[];
  page_id?: string | string[];
}): Promise<SeoRedirectLookup | null> {
  const raw =
    (Array.isArray(query.p) ? query.p[0] : query.p) ||
    (Array.isArray(query.page_id) ? query.page_id[0] : query.page_id);
  const kind = query.p ? "p" : "page_id";
  const id = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return lookupDb(`/?${kind}=${id}`);
}

export async function resolveSeoRedirect(pathname: string): Promise<SeoRedirectLookup | null> {
  const path = normalizeRedirectPath(pathname);
  if (!path) return null;

  const staticDest = matchStaticSeoRedirect(path);
  if (staticDest && staticDest !== path) {
    return { destination: staticDest, statusCode: 301 };
  }

  const fromDb = await lookupDb(path);
  if (fromDb && fromDb.destination !== path) {
    return fromDb;
  }

  return null;
}

export async function resolveSeoRedirectOrNews(pathname: string): Promise<SeoRedirectLookup | null> {
  const mapped = await resolveSeoRedirect(pathname);
  if (mapped) return mapped;

  const path = normalizeRedirectPath(pathname);
  const parts = path.split("/").filter(Boolean);
  if (parts.length !== 1) return null;
  const slug = parts[0]!;
  if (slug === "nieuws" || slug === "news") return null;
  try {
    const post = await loadNewsPostBySlug(slug);
    if (post?.slug) {
      const dest = `/nieuws/${post.slug}`;
      if (dest !== path) return { destination: dest, statusCode: 301 };
    }
  } catch {
    /* news table optional */
  }
  return null;
}

export async function followSeoRedirect(pathname: string): Promise<void> {
  const hit = await resolveSeoRedirectOrNews(pathname);
  if (hit) {
    permanentRedirect(hit.destination);
  }
}
