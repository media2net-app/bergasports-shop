import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import ShopListingPage, { type ShopListingSearchParams } from "@/components/shop/ShopListingPage";
import CmsPageView from "@/components/site/CmsPageView";
import { buildCategorySeoContent } from "@/lib/category-seo";
import { loadCategorySeoOverrides, loadRalexCategories } from "@/lib/categories-db";
import { loadCatalogProducts } from "@/lib/products-db";
import { formatRalexCategoryName } from "@/lib/ralex-categories";
import {
  findRalexCategoryNodeBySlug,
  resolveShopCategoryFilter,
  shopCategoryPath,
} from "@/lib/shop-category-filter";
import { getPublishedPageByPath } from "@/lib/site-pages-db";

export const dynamic = "force-dynamic";

const RESERVED = new Set([
  "admin",
  "api",
  "shop",
  "product",
  "categorii",
  "contact",
  "despre-noi",
  "_next",
]);

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<ShopListingSearchParams>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug || RESERVED.has(slug)) {
    return {};
  }

  const categoriesFile = await loadRalexCategories();
  const category = findRalexCategoryNodeBySlug(categoriesFile.tree, slug);
  if (category) {
    const name = formatRalexCategoryName(category.name);
    const canonical = shopCategoryPath(category.slug);
    const [catalog, overrides] = await Promise.all([
      loadCatalogProducts(),
      loadCategorySeoOverrides(category.slug),
    ]);
    const { filteredProducts } = resolveShopCategoryFilter(
      catalog,
      categoriesFile.tree,
      category.slug,
    );
    const seo = buildCategorySeoContent({
      categoryNode: category,
      categoryTree: categoriesFile.tree,
      productsInCategory: filteredProducts,
      customIntro: overrides?.seoIntro,
      customFooterHtml: overrides?.seoFooterHtml,
    });
    const metaTitle = overrides?.seoMetaTitle?.trim() || `${name} | Bergasports`;
    const metaDescription = overrides?.seoMetaDescription?.trim() || seo.metaDescription;
    return {
      title: metaTitle,
      description: metaDescription,
      alternates: { canonical },
      openGraph: {
        title: metaTitle,
        description: metaDescription,
        url: canonical,
      },
    };
  }

  const page = await getPublishedPageByPath(`/${slug}`);
  if (page) {
    return { title: page.title };
  }

  return {};
}

export default async function SlugPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  if (!slug || RESERVED.has(slug)) {
    notFound();
  }

  const sp = (await searchParams) ?? {};
  const categoriesFile = await loadRalexCategories();
  const category = findRalexCategoryNodeBySlug(categoriesFile.tree, slug);

  if (category) {
    return <ShopListingPage pathCategorySlug={category.slug} searchParams={sp} />;
  }

  const path = `/${slug}`;
  const page = await getPublishedPageByPath(path);
  if (!page) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      <TrustBar />
      <Header />
      <CmsPageView page={page} />
      <Footer />
    </main>
  );
}
