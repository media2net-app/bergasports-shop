import Link from "next/link";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import ShopProductCard from "@/components/shop/ShopProductCard";
import ShopSidebar from "@/components/shop/ShopSidebar";
import ShopToolbar from "@/components/shop/ShopToolbar";
import { CategorySeoFooter, CategorySeoIntro } from "@/components/shop/CategorySeoContent";
import {
  applyShopFacetFilters,
  applyShopSearchQuery,
  buildShopListingUrl,
  findRalexCategoryNodeBySlug,
  getAvailableShopColorFacets,
  getAvailableShopSizeFacets,
  parseShopColorParams,
  parseShopSizeParams,
  resolveShopCategoryFilter,
  shopColorFacetLabel,
  shopSizeFacetLabel,
  toShopFacetChips,
} from "@/lib/shop-category-filter";
import { buildCategorySeoContent } from "@/lib/category-seo";
import { loadCategorySeoOverrides, loadRalexCategories } from "@/lib/categories-db";
import { loadCatalogProducts } from "@/lib/products-db";
import { applyShopMerchView, parseShopMerchView, shopMerchViewLabel } from "@/lib/shop-merchandising-views";
import { applyShopSort, parseShopSortParam } from "@/lib/shop-sort";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export type ShopListingSearchParams = {
  page?: string;
  cat?: string;
  color?: string;
  marime?: string;
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
  const [catalog, categoriesFile] = await Promise.all([loadCatalogProducts(), loadRalexCategories()]);
  const categoryTree = categoriesFile.tree;
  const sp = searchParams ?? {};
  const requestedPage = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);
  const rawCat =
    pathCategorySlug?.trim() ||
    (typeof sp.cat === "string" && sp.cat.trim().length > 0 ? sp.cat.trim() : undefined);
  const colorIds = parseShopColorParams(typeof sp.color === "string" ? sp.color : undefined);
  const sizeIds = parseShopSizeParams(typeof sp.marime === "string" ? sp.marime : undefined);
  const searchTrimmed =
    typeof sp.q === "string" && sp.q.trim().length > 0 ? sp.q.trim() : null;
  const sort = parseShopSortParam(typeof sp.sort === "string" ? sp.sort : undefined);
  const merchView = parseShopMerchView(typeof sp.view === "string" ? sp.view : undefined);

  const catResolved = resolveShopCategoryFilter(catalog, categoryTree, rawCat);

  let filteredProducts = catResolved.filteredProducts;
  if (!catResolved.unknownCategory) {
    filteredProducts = applyShopFacetFilters(filteredProducts, colorIds, sizeIds);
    filteredProducts = applyShopSearchQuery(filteredProducts, searchTrimmed);
  } else if (searchTrimmed || merchView) {
    let pool = catalog;
    pool = applyShopFacetFilters(pool, colorIds, sizeIds);
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

  const heading = catResolved.unknownCategory
    ? merchView
      ? shopMerchViewLabel(merchView)
      : "Categorie niet gevonden"
    : catResolved.categoryLabel
      ? catResolved.categoryLabel
      : merchView
        ? shopMerchViewLabel(merchView)
        : "Alle producten";

  const facetNote =
    !catResolved.unknownCategory && (colorIds.length > 0 || sizeIds.length > 0)
      ? `Actieve filters: ${[
          ...colorIds.map(shopColorFacetLabel),
          ...sizeIds.map(shopSizeFacetLabel),
        ].join(", ")}.`
      : null;

  const searchNote = searchTrimmed ? `Zoeken: „${searchTrimmed}”.` : null;

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
        })
      : null;

  const showCategorySeoIntro = Boolean(categorySeo);
  const showCategorySeoFooter = Boolean(categorySeo);

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      <TrustBar />
      <Header />

      <section className="mx-auto w-full max-w-[1440px] px-4 py-6 md:py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-[var(--foreground)] md:text-4xl">
            {heading}
          </h1>
          {(categorySlug || catResolved.unknownCategory) && (
            <Link
              href="/shop"
              className="shrink-0 text-sm font-semibold text-[#96741f] underline underline-offset-2"
            >
              Bekijk alle producten
            </Link>
          )}
        </div>

        {catResolved.unknownCategory ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Deze categorie bestaat niet in onze catalogus. Kies een categorie in het menu of bekijk alle producten.
          </p>
        ) : null}

        {showCategorySeoIntro && categorySeo ? <CategorySeoIntro seo={categorySeo} /> : null}

        {!catResolved.unknownCategory && total === 0 && searchTrimmed ? (
          <div className="mt-4 rounded-xl border border-[#e5dcc8] bg-white px-4 py-3 text-sm text-[var(--foreground)]/85">
            <p>
              Geen resultaten voor deze zoekopdracht. Probeer een andere term of{" "}
              <Link
                href={buildShopListingUrl({ ...listingQuery, page: 1, search: null })}
                className="font-semibold text-[#96741f] underline"
              >
                wis de zoekopdracht
              </Link>
              .
            </p>
            {categoryTree.length > 0 ? (
              <p className="mt-3">
                Of bekijk:{" "}
                {categoryTree.slice(0, 5).map((root, i) => (
                  <span key={root.id}>
                    {i > 0 ? " · " : null}
                    <Link
                      href={buildShopListingUrl({
                        ...listingQuery,
                        page: 1,
                        cat: root.slug,
                        search: null,
                      })}
                      className="font-semibold text-[#96741f] underline"
                    >
                      {root.name}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        ) : null}
        {!catResolved.unknownCategory && total === 0 && categorySlug && !colorIds.length && !sizeIds.length && !searchTrimmed ? (
          <p className="mt-4 rounded-xl border border-[#e5dcc8] bg-white px-4 py-3 text-sm text-[var(--foreground)]/85">
            Er zijn momenteel geen producten in deze categorie.
          </p>
        ) : null}
        {!catResolved.unknownCategory && total === 0 && (colorIds.length > 0 || sizeIds.length > 0) ? (
          <p className="mt-4 rounded-xl border border-[#e5dcc8] bg-white px-4 py-3 text-sm text-[var(--foreground)]/85">
            Geen producten voldoen aan de geselecteerde filters. Probeer kleur- of maatfilters te verwijderen.
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="shrink-0 lg:sticky lg:top-24 lg:z-20 lg:w-72 lg:max-h-[calc(100vh-6.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
            <ShopSidebar
              activeCategorySlug={categorySlug}
              selectedColors={colorIds}
              selectedSizes={sizeIds}
              colorFacets={toShopFacetChips(sidebarColorFacets)}
              sizeFacets={toShopFacetChips(sidebarSizeFacets)}
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
                  ? "0 producten getoond."
                  : `${total} product${total === 1 ? "" : "en"}${catResolved.categoryLabel ? ` in ${catResolved.categoryLabel}` : " in de Bergasports-catalogus"}`}
                {!catResolved.unknownCategory && totalPages > 1 ? (
                  <>
                    {" "}
                    · <span className="font-semibold text-[var(--foreground)]">{from}</span>–
                    <span className="font-semibold text-[var(--foreground)]">{to}</span> van {total} (pagina {page} van {totalPages})
                  </>
                ) : null}
                {!catResolved.unknownCategory ? "." : ""}
              </p>
              {searchTrimmed ? (
                <Link
                  href={buildShopListingUrl({ ...listingQuery, page: 1, search: null })}
                  className="text-xs font-semibold text-[#96741f] underline underline-offset-2"
                >
                  Wis zoekopdracht
                </Link>
              ) : null}
              {facetNote ? <p className="text-xs text-[var(--foreground)]/65">{facetNote}</p> : null}
              {searchNote ? <p className="text-xs text-[var(--foreground)]/65">{searchNote}</p> : null}
            </div>

            {!catResolved.unknownCategory || merchView ? (
              <ShopToolbar
                categorySlug={categorySlug}
                selectedColors={colorIds}
                selectedSizes={sizeIds}
                searchQuery={searchTrimmed}
                sort={sort}
                merchView={merchView}
                categoryLabel={catResolved.categoryLabel}
                colorLabels={toShopFacetChips(sidebarColorFacets)}
                sizeLabels={toShopFacetChips(sidebarSizeFacets)}
              />
            ) : null}

            <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:gap-5">
              {pageProducts.map((product, index) => (
                <ShopProductCard
                  key={product.id}
                  product={product}
                  ctaLabel="Bekijk product"
                  priority={page === 1 && index === 0}
                />
              ))}
            </div>

            {!catResolved.unknownCategory && totalPages > 1 ? (
              <nav
                className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#e5dcc8] pt-8 sm:flex-row"
                role="navigation"
                aria-label="Paginering webshop"
              >
                <p className="text-sm text-[var(--foreground)]/80">
                  Pagina <span className="font-semibold text-[var(--foreground)]">{page}</span> van{" "}
                  <span className="font-semibold text-[var(--foreground)]">{totalPages}</span>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {page <= 1 ? (
                    <span className="rounded-full border border-[#e5dcc8] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]/40">
                      Vorige
                    </span>
                  ) : (
                    <Link
                      href={pageHref(page - 1)}
                      className="rounded-full border border-[#e5dcc8] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[#B38F27] hover:bg-[#faf8f4]"
                    >
                      Vorige
                    </Link>
                  )}
                  {page >= totalPages ? (
                    <span className="rounded-full border border-[#e5dcc8] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]/40">
                      Volgende
                    </span>
                  ) : (
                    <Link
                      href={pageHref(page + 1)}
                      className="rounded-full border border-[#B38F27] bg-[#B38F27] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#96741f]"
                    >
                      Volgende
                    </Link>
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
