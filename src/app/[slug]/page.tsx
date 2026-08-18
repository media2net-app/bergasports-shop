import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import ShopListingPage, { type ShopListingSearchParams } from "@/components/shop/ShopListingPage";
import CmsPageView from "@/components/site/CmsPageView";
import { buildCategorySeoContent } from "@/lib/category-seo";
import { loadCategorySeoOverrides, loadRalexCategories } from "@/lib/categories-db";
import { loadCatalogProducts } from "@/lib/products-db";
import { categoryDisplayName, categorySeoDefaults } from "@/lib/category-meta";
import { formatRalexCategoryName } from "@/lib/ralex-categories";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_META_DESCRIPTION } from "@/lib/site-content";
import {
  findRalexCategoryNodeBySlug,
  resolveShopCategoryFilter,
  shopCategoryPath,
} from "@/lib/shop-category-filter";
import { getPublishedPageByPath } from "@/lib/site-pages-db";
import { isKnownLocalePrefix } from "@/lib/i18n/locale-codes";
import { getRequestLocale, localizedPublicPath } from "@/lib/i18n/locale";
import { parseLocaleMap, pickTranslation, type CategoryLocaleFields, type PageLocaleFields } from "@/lib/i18n/translations";
import { followSeoRedirect } from "@/lib/seo-redirects";

export const dynamic = "force-dynamic";

const RESERVED = new Set([
  "admin",
  "api",
  "shop",
  "product",
  "categorii",
  "contact",
  "despre-noi",
  "over-ons",
  "onderhoud",
  "afspraak",
  "about-us",
  "service",
  "nieuws",
  "news",
  "verzending",
  "shipping",
  "retouren",
  "returns",
  "account",
  "checkout",
  "privacy",
  "_next",
]);

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<ShopListingSearchParams>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) {
    return {};
  }
  if (RESERVED.has(slug) || isKnownLocalePrefix(slug)) {
    await followSeoRedirect(`/${slug}`);
    return {};
  }

  const categoriesFile = await loadRalexCategories();
  const category = findRalexCategoryNodeBySlug(categoriesFile.tree, slug);
  if (category) {
    const defaults = categorySeoDefaults(category.slug);
    const name = categoryDisplayName(category.slug, formatRalexCategoryName(category.name));
    const canonical = shopCategoryPath(category.slug);
    const translatedSlug = Object.values(parseLocaleMap<CategoryLocaleFields>(category.translations)).some(
      (fields) => fields.slug?.trim().toLowerCase() === slug,
    );
    if (canonical !== `/${slug}` && !translatedSlug) {
      permanentRedirect(await localizedPublicPath(canonical));
    }

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
    const seoTitle = overrides?.seoMetaTitle?.trim() || defaults?.seoTitle;
    return buildPageMetadata({
      absoluteTitle: seoTitle || undefined,
      title: seoTitle ? undefined : name,
      description: overrides?.seoMetaDescription?.trim() || seo.metaDescription,
      path: await localizedPublicPath(translatedSlug ? `/${slug}` : canonical),
      image: filteredProducts[0]?.image ?? null,
      imageAlt: name,
    });
  }

  const page = await getPublishedPageByPath(`/${slug}`);
  if (page) {
    const adminTitle = page.meta_title?.trim();
    return buildPageMetadata({
      absoluteTitle: adminTitle || undefined,
      title: adminTitle ? undefined : page.title,
      description: page.meta_description?.trim() || SITE_META_DESCRIPTION,
      path: await localizedPublicPath(`/${slug}`),
      image: page.social_image,
      imageAlt: page.image_alt || page.title,
      noindex: page.noindex,
      ogTitle: page.og_title,
      ogDescription: page.og_description,
    });
  }

  await followSeoRedirect(`/${slug}`);
  return {};
}

export default async function SlugPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  if (!slug) {
    notFound();
  }
  if (RESERVED.has(slug) || isKnownLocalePrefix(slug)) {
    await followSeoRedirect(`/${slug}`);
    notFound();
  }

  const sp = (await searchParams) ?? {};
  const categoriesFile = await loadRalexCategories();
  const category = findRalexCategoryNodeBySlug(categoriesFile.tree, slug);

  if (category) {
    const canonical = shopCategoryPath(category.slug);
    const translatedSlug = Object.values(parseLocaleMap<CategoryLocaleFields>(category.translations)).some(
      (fields) => fields.slug?.trim().toLowerCase() === slug,
    );
    if (canonical !== `/${slug}` && !translatedSlug) {
      permanentRedirect(await localizedPublicPath(canonical));
    }
    return <ShopListingPage pathCategorySlug={category.slug} searchParams={sp} />;
  }

  const path = `/${slug}`;
  const page = await getPublishedPageByPath(path);
  if (!page) {
    await followSeoRedirect(path);
    notFound();
  }
  const locale = await getRequestLocale();
  const overlay = pickTranslation<PageLocaleFields>(page.translations, locale);

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <TrustBar />
      <Header />
      <CmsPageView
        page={{
          ...page,
          title: overlay?.title || page.title,
          heading: overlay?.heading || page.heading,
          body_html: overlay?.bodyHtml || page.body_html,
          image_alt: overlay?.imageAlt || page.image_alt,
        }}
      />
      <Footer />
    </main>
  );
}
