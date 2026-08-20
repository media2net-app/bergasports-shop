import LocalizedLink from "@/components/locale/LocalizedLink";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ShopProductCard from "@/components/shop/ShopProductCard";
import ShopSidebar from "@/components/shop/ShopSidebar";
import ShopToolbar from "@/components/shop/ShopToolbar";
import { CategorySeoFooter } from "@/components/shop/CategorySeoContent";
import { CategorySeoIntroCollapsible } from "@/components/shop/CategorySeoIntroCollapsible";
import {
  applyShopBrandFilter,
  applyShopFacetFilters,
  applyShopSearchQuery,
  applyShopSpecFilter,
  buildShopListingUrl,
  findRalexCategoryNodeBySlug,
  getAvailableShopBrandFacets,
  getAvailableShopColorFacets,
  getAvailableShopSizeFacets,
  getAvailableShopSpecFacetGroups,
  parseShopBrandParams,
  parseShopColorParams,
  parseShopSizeParams,
  parseShopSpecParams,
  resolveShopCategoryFilter,
  shopBrandFacetLabel,
  shopColorFacetLabel,
  shopSizeFacetLabel,
  shopSpecFacetLabel,
  toShopFacetChips,
} from "@/lib/shop-category-filter";
import { buildCategorySeoContent } from "@/lib/category-seo";
import { loadCategorySeoOverrides, loadRalexCategories } from "@/lib/categories-db";
import { getRequestLocale } from "@/lib/i18n/locale";
import { localizedMerchViewLabel, ui } from "@/lib/i18n/ui";
import { loadCatalogProducts } from "@/lib/products-db";
import { listShopBrands } from "@/lib/brands-db";
import { applyShopMerchView, parseShopMerchView } from "@/lib/shop-merchandising-views";
import { applyShopSort, parseShopSortParam } from "@/lib/shop-sort";
import { formatRalexCategoryName } from "@/lib/ralex-categories";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export type ShopListingSearchParams = {
  page?: string;
  cat?: string;
  color?: string;
  marime?: string;
  merk?: string;
  eig?: string;
  q?: string;
  sort?: string;
  view?: string;
};

type Props = {
  /** Category from path segment (`/halate-baie`). */
  pathCategorySlug?: string;
  searchParams?: ShopListingSearchParams;
};

export default async function ShopListingPage({ pathCategorySlug, searchParams }: Props) {
  const locale = await getRequestLocale();
  const t = ui(locale);
  const [catalog, categoriesFile, managedBrands] = await Promise.all([
    loadCatalogProducts(),
    loadRalexCategories(),
    listShopBrands().catch(() => []),
  ]);
  const categoryTree = categoriesFile.tree;
  const sp = searchParams ?? {};
  const requestedPage = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);
  const rawCat =
    pathCategorySlug?.trim() ||
    (typeof sp.cat === "string" && sp.cat.trim().length > 0 ? sp.cat.trim() : undefined);
  const colorIds = parseShopColorParams(typeof sp.color === "string" ? sp.color : undefined);
  const sizeIds = parseShopSizeParams(typeof sp.marime === "string" ? sp.marime : undefined);
  const brandIds = parseShopBrandParams(typeof sp.merk === "string" ? sp.merk : undefined);
  const specIds = parseShopSpecParams(typeof sp.eig === "string" ? sp.eig : undefined);
  const searchTrimmed =
    typeof sp.q === "string" && sp.q.trim().length > 0 ? sp.q.trim() : null;
  const sort = parseShopSortParam(typeof sp.sort === "string" ? sp.sort : undefined);
  const merchView = parseShopMerchView(typeof sp.view === "string" ? sp.view : undefined);

  const catResolved = resolveShopCategoryFilter(catalog, categoryTree, rawCat);

  let filteredProducts = catResolved.filteredProducts;
  if (!catResolved.unknownCategory) {
    filteredProducts = applyShopFacetFilters(filteredProducts, colorIds, sizeIds);
    filteredProducts = applyShopBrandFilter(filteredProducts, brandIds);
    filteredProducts = applyShopSpecFilter(filteredProducts, specIds);
    filteredProducts = applyShopSearchQuery(filteredProducts, searchTrimmed);
  } else if (searchTrimmed || merchView) {
    let pool = catalog;
    pool = applyShopFacetFilters(pool, colorIds, sizeIds);
    pool = applyShopBrandFilter(pool, brandIds);
    pool = applyShopSpecFilter(pool, specIds);
    filteredProducts = applyShopSearchQuery(pool, searchTrimmed);
  }

  if (!catResolved.unknownCategory || merchView) {
    filteredProducts = applyShopMerchView(filteredProducts, merchView);
    filteredProducts = applyShopSort(filteredProducts, sort, searchTrimmed);
  }

  const total = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * PAGE_SIZE;
  const pageProducts = filteredProducts.slice(offset, offset + PAGE_SIZE);
  const from = total > 0 ? offset + 1 : 0;
  const to = Math.min(offset + PAGE_SIZE, total);

  const categorySlug = catResolved.categorySlug;
  const listingQuery = {
    cat: categorySlug,
    colors: colorIds,
    sizes: sizeIds,
    brands: brandIds,
    specs: specIds,
    search: searchTrimmed,
    sort,
    view: merchView,
  };

  const pageHref = (p: number) => buildShopListingUrl({ ...listingQuery, page: p });

  const facetDiscoveryPool = catResolved.unknownCategory
    ? searchTrimmed
      ? applyShopSearchQuery(catalog, searchTrimmed)
      : []
    : catResolved.filteredProducts;
  const facetPoolWithSearch = searchTrimmed
    ? applyShopSearchQuery(facetDiscoveryPool, searchTrimmed)
    : facetDiscoveryPool;
  const sidebarColorFacets = getAvailableShopColorFacets(
    facetPoolWithSearch,
    colorIds,
    sizeIds,
  );
  const sidebarSizeFacets = getAvailableShopSizeFacets(
    facetPoolWithSearch,
    colorIds,
    sizeIds,
  );
  const brandPool = applyShopSpecFilter(
    applyShopFacetFilters(facetPoolWithSearch, colorIds, sizeIds),
    specIds,
  );
  const specPool = applyShopBrandFilter(
    applyShopFacetFilters(facetPoolWithSearch, colorIds, sizeIds),
    brandIds,
  );
  const sidebarBrandFacets = getAvailableShopBrandFacets(brandPool, brandIds, managedBrands);
  const sidebarSpecGroups = getAvailableShopSpecFacetGroups(specPool, specIds);

  const heading = catResolved.unknownCategory
    ? merchView
      ? localizedMerchViewLabel(merchView, locale)
      : t.categoryNotFound
    : catResolved.categoryLabel
      ? catResolved.categoryLabel
      : merchView
        ? localizedMerchViewLabel(merchView, locale)
        : t.allProducts;

  const facetNote =
    !catResolved.unknownCategory &&
    (colorIds.length > 0 || sizeIds.length > 0 || brandIds.length > 0 || specIds.length > 0)
      ? t.activeFilters(
          [
            ...brandIds.map((id) => shopBrandFacetLabel(id, sidebarBrandFacets)),
            ...specIds.map((id) => shopSpecFacetLabel(id, sidebarSpecGroups)),
            ...colorIds.map(shopColorFacetLabel),
            ...sizeIds.map(shopSizeFacetLabel),
          ].join(", "),
        )
      : null;

  const searchNote = searchTrimmed ? t.searchNote(searchTrimmed) : null;

  const categoryNode =
    categorySlug && !catResolved.unknownCategory
      ? findRalexCategoryNodeBySlug(categoryTree, categorySlug)
      : null;

  const seoOverrides =
    categoryNode && page === 1 ? await loadCategorySeoOverrides(categoryNode.slug) : null;

  const categorySeo =
    categoryNode && page === 1 && !searchTrimmed
      ? buildCategorySeoContent({
          categoryNode,
          categoryTree,
          productsInCategory: catResolved.filteredProducts,
          customIntro: seoOverrides?.seoIntro,
          customFooterHtml: seoOverrides?.seoFooterHtml,
          locale,
        })
      : null;

  const showCategorySeoIntro = Boolean(categorySeo);
  const showCategorySeoFooter = Boolean(categorySeo);

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      <Header />

      <section className="mx-auto w-full max-w-[1440px] px-4 py-6 md:py-10 lg:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">
            {heading}
          </h1>
          {(categorySlug || catResolved.unknownCategory) && (
            <LocalizedLink
              href="/shop"
              className="shrink-0 text-sm font-semibold text-[#96741f] underline underline-offset-2"
            >
              {t.viewProducts}
            </LocalizedLink>
          )}
        </div>

        {catResolved.unknownCategory ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {t.categoryMissingHint}
          </p>
        ) : null}

        {showCategorySeoIntro && categorySeo ? (
          <CategorySeoIntroCollapsible seo={categorySeo} />
        ) : null}

        {!catResolved.unknownCategory && total === 0 && searchTrimmed ? (
          <div className="mt-4 rounded-xl border border-[#e5dcc8] bg-white px-4 py-3 text-sm text-[var(--foreground)]/85">
            <p>
              {t.noSearchResults}{" "}
              <LocalizedLink
                href={buildShopListingUrl({ ...listingQuery, page: 1, search: null })}
                className="font-semibold text-[#96741f] underline"
              >
                {t.clearSearch}
              </LocalizedLink>
              .
            </p>
            {categoryTree.length > 0 ? (
              <p className="mt-3">
                {t.orBrowse}{" "}
                {categoryTree.slice(0, 5).map((root, i) => (
                  <span key={root.id}>
                    {i > 0 ? " · " : null}
                    <LocalizedLink
                      href={buildShopListingUrl({
                        ...listingQuery,
                        page: 1,
                        cat: root.slug,
                        search: null,
                      })}
                      className="font-semibold text-[#96741f] underline"
                    >
                      {formatRalexCategoryName(root.name, root.slug)}
                    </LocalizedLink>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        ) : null}
        {!catResolved.unknownCategory && total === 0 && categorySlug && !colorIds.length && !sizeIds.length && !brandIds.length && !specIds.length && !searchTrimmed ? (
          <p className="mt-4 rounded-xl border border-[#e5dcc8] bg-white px-4 py-3 text-sm text-[var(--foreground)]/85">
            {t.noProductsInCategory}
          </p>
        ) : null}
        {!catResolved.unknownCategory && total === 0 && (colorIds.length > 0 || sizeIds.length > 0 || brandIds.length > 0 || specIds.length > 0) ? (
          <p className="mt-4 rounded-xl border border-[#e5dcc8] bg-white px-4 py-3 text-sm text-[var(--foreground)]/85">
            {t.noProductsMatchFilters}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="shrink-0 lg:sticky lg:top-28 lg:z-20 lg:w-64 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
            <ShopSidebar
              activeCategorySlug={categorySlug}
              selectedColors={colorIds}
              selectedSizes={sizeIds}
              selectedBrands={brandIds}
              selectedSpecs={specIds}
              colorFacets={toShopFacetChips(sidebarColorFacets)}
              sizeFacets={toShopFacetChips(sidebarSizeFacets)}
              brandFacets={sidebarBrandFacets}
              specGroups={sidebarSpecGroups}
              searchQuery={searchTrimmed}
              sort={sort}
              merchView={merchView}
              hideFacets={catResolved.unknownCategory && !merchView}
            />
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="text-sm text-[var(--foreground)]/80">
                {catResolved.unknownCategory
                  ? t.productsShownZero
                  : `${t.productsCount(total)}${catResolved.categoryLabel ? t.inCategory(catResolved.categoryLabel) : t.inCatalog}`}
                {!catResolved.unknownCategory && totalPages > 1
                  ? t.rangeOfTotal(from, to, total, page, totalPages)
                  : null}
                {!catResolved.unknownCategory ? "." : ""}
              </p>
              {searchTrimmed ? (
                <LocalizedLink
                  href={buildShopListingUrl({ ...listingQuery, page: 1, search: null })}
                  className="text-xs font-semibold text-[#96741f] underline underline-offset-2"
                >
                  {t.clearSearchShort}
                </LocalizedLink>
              ) : null}
              {facetNote ? <p className="text-xs text-[var(--foreground)]/65">{facetNote}</p> : null}
              {searchNote ? <p className="text-xs text-[var(--foreground)]/65">{searchNote}</p> : null}
            </div>

            {!catResolved.unknownCategory || merchView ? (
              <ShopToolbar
                categorySlug={categorySlug}
                selectedColors={colorIds}
                selectedSizes={sizeIds}
                selectedBrands={brandIds}
                selectedSpecs={specIds}
                searchQuery={searchTrimmed}
                sort={sort}
                merchView={merchView}
                categoryLabel={catResolved.categoryLabel}
                colorLabels={toShopFacetChips(sidebarColorFacets)}
                sizeLabels={toShopFacetChips(sidebarSizeFacets)}
                brandLabels={sidebarBrandFacets}
                specGroups={sidebarSpecGroups}
              />
            ) : null}

            <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:gap-5">
              {pageProducts.map((product, index) => (
                <ShopProductCard
                  key={product.id}
                  product={product}
                  priority={page === 1 && index === 0}
                />
              ))}
            </div>

            {!catResolved.unknownCategory && totalPages > 1 ? (
              <nav
                className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#e5dcc8] pt-8 sm:flex-row"
                role="navigation"
                aria-label={t.paginationAria}
              >
                <p className="text-sm text-[var(--foreground)]/80">
                  {t.pageOf(page, totalPages)}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {page <= 1 ? (
                    <span className="rounded-full border border-[#e5dcc8] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]/40">
                      {t.previous}
                    </span>
                  ) : (
                    <LocalizedLink
                      href={pageHref(page - 1)}
                      className="rounded-full border border-[#e5dcc8] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[#B38F27] hover:bg-[#faf8f4]"
                    >
                      {t.previous}
                    </LocalizedLink>
                  )}
                  {page >= totalPages ? (
                    <span className="rounded-full border border-[#e5dcc8] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]/40">
                      {t.next}
                    </span>
                  ) : (
                    <LocalizedLink
                      href={pageHref(page + 1)}
                      className="rounded-full border border-[#B38F27] bg-[#B38F27] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#96741f]"
                    >
                      {t.next}
                    </LocalizedLink>
                  )}
                </div>
              </nav>
            ) : null}
          </div>
        </div>

        {showCategorySeoFooter && categorySeo ? (
          <CategorySeoFooter seo={categorySeo} showProductLinks={!searchTrimmed} />
        ) : null}
      </section>

      <Footer />
    </main>
  );
}
