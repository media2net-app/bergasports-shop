import type { MetadataRoute } from "next";

import { loadRalexCategories } from "@/lib/categories-db";
import { productPath } from "@/lib/product-slug";
import { loadCatalogProducts } from "@/lib/products-db";
import { flattenRalexCategoryTree } from "@/lib/ralex-categories";
import { shopCategoryPath } from "@/lib/shop-category-filter";
import { isOmittedFromPublicNav } from "@/lib/shop-nav-tree";
import { requirePrisma } from "@/lib/database";
import { loadNewsPosts } from "@/lib/news-db";
import { LEGAL_PAGE_PATHS } from "@/lib/site-content";

export const dynamic = "force-dynamic";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergasports.com").replace(/\/$/, "");
}

/** Alleen indexeerbare pagina's: /account en redirects (zoals /despre-noi) horen hier niet. */
const STATIC_PATHS = [
  "/",
  "/shop",
  "/contact",
  "/over-ons",
  "/onderhoud",
  "/afspraak",
  "/merken",
  "/nieuws",
  "/verzending",
  "/retouren",
  LEGAL_PAGE_PATHS.terms,
  LEGAL_PAGE_PATHS.privacy,
  LEGAL_PAGE_PATHS.cookies,
  LEGAL_PAGE_PATHS.payment,
] as const;

/** Paden die nooit in de sitemap mogen, ook niet via de CMS-tabel. */
const SITEMAP_EXCLUDED = new Set(["/account", "/checkout", "/despre-noi"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  function pushPath(
    path: string,
    meta: { lastModified?: Date; changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"]; priority?: number },
  ) {
    entries.push({ url: `${base}${path}`, ...meta });
  }

  const entries: MetadataRoute.Sitemap = [];

  for (const path of STATIC_PATHS) {
    pushPath(path, {
      lastModified: now,
      changeFrequency: path === "/" ? "daily" : "weekly",
      priority: path === "/" ? 1 : path === "/shop" ? 0.9 : 0.6,
    });
  }

  const [products, categoriesFile] = await Promise.all([
    loadCatalogProducts(),
    loadRalexCategories(),
  ]);

  for (const product of products) {
    pushPath(productPath(product), {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const cat of flattenRalexCategoryTree(categoriesFile.tree)) {
    if (!cat.slug?.trim() || isOmittedFromPublicNav(cat)) continue;
    pushPath(shopCategoryPath(cat.slug), {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  try {
    const news = await loadNewsPosts({ limit: 200 });
    for (const post of news) {
      pushPath(`/nieuws/${post.slug}`, {
        lastModified: post.publishedAt ?? now,
        changeFrequency: "weekly",
        priority: 0.55,
      });
    }
  } catch {
    /* news optional */
  }

  try {
    const prisma = requirePrisma();
    const pages = await prisma.sitePage.findMany({
      where: { isPublished: true, path: { not: "/" } },
      select: { path: true, updatedAt: true },
    });

    for (const row of pages) {
      const pagePath = row.path.trim();
      if (
        !pagePath ||
        pagePath.startsWith("/admin") ||
        SITEMAP_EXCLUDED.has(pagePath) ||
        STATIC_PATHS.includes(pagePath as (typeof STATIC_PATHS)[number])
      ) {
        continue;
      }
      pushPath(pagePath.startsWith("/") ? pagePath : `/${pagePath}`, {
        lastModified: row.updatedAt,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    /* site_pages optional */
  }

  return entries;
}
