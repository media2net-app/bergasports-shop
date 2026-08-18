import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

import ShopListingPage, { type ShopListingSearchParams } from "@/components/shop/ShopListingPage";
import { buildPageMetadata } from "@/lib/seo";
import {
  buildShopListingUrl,
  parseShopBrandParams,
  parseShopColorParams,
  parseShopSizeParams,
  parseShopSpecParams,
} from "@/lib/shop-category-filter";
import { parseShopSortParam } from "@/lib/shop-sort";
import { PAGE_SEO } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  absoluteTitle: PAGE_SEO.shop.title,
  description: PAGE_SEO.shop.description,
  path: "/shop",
});

type PageProps = {
  searchParams?: Promise<ShopListingSearchParams>;
};

export default async function MagazinPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const rawCat = typeof sp.cat === "string" ? sp.cat.trim() : "";

  if (rawCat) {
    permanentRedirect(
      buildShopListingUrl({
        cat: rawCat,
        page: Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1),
        colors: parseShopColorParams(typeof sp.color === "string" ? sp.color : undefined),
        sizes: parseShopSizeParams(typeof sp.marime === "string" ? sp.marime : undefined),
        brands: parseShopBrandParams(typeof sp.merk === "string" ? sp.merk : undefined),
        specs: parseShopSpecParams(typeof sp.eig === "string" ? sp.eig : undefined),
        search: typeof sp.q === "string" && sp.q.trim().length > 0 ? sp.q.trim() : null,
        sort: parseShopSortParam(typeof sp.sort === "string" ? sp.sort : undefined),
      }),
    );
  }

  return <ShopListingPage searchParams={sp} />;
}
