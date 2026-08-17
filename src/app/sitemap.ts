import type { MetadataRoute } from "next";

import { loadRalexCategories } from "@/lib/categories-db";
import { productPath } from "@/lib/product-slug";
import { loadCatalogProducts } from "@/lib/products-db";
import { flattenRalexCategoryTree } from "@/lib/ralex-categories";
import { shopCategoryPath } from "@/lib/shop-category-filter";
import { requirePrisma } from "@/lib/database";
import { loadNewsPosts } from "@/lib/news-db";

export const dynamic = "force-dynamic";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergasports.com").replace(/\/$/, "");
}

const STATIC_PATHS = [
  "/",
  "/shop",
  "/contact",
  "/over-ons",
  "/onderhoud",
  "/nieuws",
  "/verzending",
  "/retouren",
  "/account",
  "/despre-noi",
  "/termeni-si-conditii",
  "/politica-de-confidentialitate",
  "/politica-cookies",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/shop" ? 0.9 : 0.6,
  }));

  const [products, categoriesFile] = await Promise.all([
    loadCatalogProducts(),
    loadRalexCategories(),
  ]);

  for (const product of products) {
    entries.push({
      url: `${base}${productPath(product)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const cat of flattenRalexCategoryTree(categoriesFile.tree)) {
    if (!cat.slug?.trim()) continue;
    entries.push({
      url: `${base}${shopCategoryPath(cat.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  try {
    const news = await loadNewsPosts({ limit: 200 });
    for (const post of news) {
      entries.push({
        url: `${base}/nieuws/${post.slug}`,
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
      if (!pagePath || pagePath.startsWith("/admin") || STATIC_PATHS.includes(pagePath as (typeof STATIC_PATHS)[number])) {
        continue;
      }
      entries.push({
        url: `${base}${pagePath.startsWith("/") ? pagePath : `/${pagePath}`}`,
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
