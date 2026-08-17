import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import ProductTikTokView from "@/components/analytics/ProductTikTokView";
import ShopProductCard from "@/components/shop/ShopProductCard";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import ProductLandingPromo from "@/components/product/ProductLandingPromo";
import ProductPurchaseActions from "@/components/product/ProductPurchaseActions";
import { ProductVariationProvider } from "@/components/product/ProductVariationContext";
import ShopDeliveryTrustPanel from "@/components/shop/ShopDeliveryTrustPanel";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import { isNumericProductPathSegment, productPath } from "@/lib/product-slug";
import { loadRalexCategories } from "@/lib/categories-db";
import { loadCatalogProducts, loadProductFromPathSegment } from "@/lib/products-db";
import {
  productMatchesShopCategory,
  resolveProductShopCategory,
  resolveShopCategoryMatch,
} from "@/lib/shop-category-filter";
import {
  formatProductCardPrice,
  formatProductPrice,
  isProductInStock,
} from "@/lib/products";
import { productBreadcrumbJsonLd, productJsonLd, productMetaDescription } from "@/lib/product-seo";
import { resolveProductContentTier } from "@/lib/product-content-tier";

export const dynamic = "force-dynamic";

function siteOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) {
    return env.replace(/\/$/, "");
  }
  return "https://e-storehouse.ro";
}

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ variation?: string }>;
};

function WcHtmlBlock({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={`wc-store-html text-sm text-[var(--foreground)]/85 ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function variationQuery(sp: { variation?: string }): string {
  const variationRaw = typeof sp.variation === "string" ? Number.parseInt(sp.variation, 10) : NaN;
  if (Number.isFinite(variationRaw) && variationRaw > 0) {
    return `?variation=${variationRaw}`;
  }
  return "";
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug: segment } = await params;
  const product = await loadProductFromPathSegment(segment);
  if (!product) {
    return { title: "Produs negasit" };
  }
  const canonical = productPath(product);
  const description = productMetaDescription(product);
  return {
    title: product.name,
    description,
    alternates: { canonical },
    openGraph: {
      title: product.name,
      description,
      url: canonical,
      images: product.image ? [{ url: product.image }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params, searchParams }: ProductDetailPageProps) {
  const { slug: segment } = await params;
  const sp = (await searchParams) ?? {};

  if (isNumericProductPathSegment(segment)) {
    const legacy = await loadProductFromPathSegment(segment);
    if (!legacy) {
      notFound();
    }
    permanentRedirect(`${productPath(legacy)}${variationQuery(sp)}`);
  }

  const product = await loadProductFromPathSegment(segment);
  if (!product) {
    notFound();
  }

  const variationRaw = typeof sp.variation === "string" ? Number.parseInt(sp.variation, 10) : NaN;
  const initialVariationId =
    Number.isFinite(variationRaw) && variationRaw > 0 ? variationRaw : undefined;

  const [catalog, categoriesFile] = await Promise.all([loadCatalogProducts(), loadRalexCategories()]);
  const productCategory = resolveProductShopCategory(product, categoriesFile.tree);

  const resolvedInitialVariationId =
    initialVariationId != null &&
    product.wcVariations?.some((v) => v.id === initialVariationId)
      ? initialVariationId
      : undefined;

  const initialVariationImage = resolvedInitialVariationId
    ? product.wcVariations?.find((v) => v.id === resolvedInitialVariationId)?.image?.trim()
    : undefined;

  const categoryMatch = productCategory
    ? resolveShopCategoryMatch(categoriesFile.tree, productCategory.slug)
    : null;

  const similarProducts = (() => {
    const pool = catalog.filter((item) => item.id !== product.id);
    if (categoryMatch) {
      return pool.filter((item) => productMatchesShopCategory(item, categoryMatch));
    }
    const label = product.category?.trim();
    if (label) {
      return pool.filter((item) => item.category?.trim() === label);
    }
    return [];
  })().slice(0, 4);

  const highlightedFeatures: string[] = [];
  if (product.brand) {
    highlightedFeatures.push(`Brand: ${product.brand}`);
  }
    highlightedFeatures.push(`Categorie: ${product.category}`);
  if (product.freeCargo) {
    highlightedFeatures.push("Gratis verzending beschikbaar");
  }
  if (product.sameDayShipping) {
    highlightedFeatures.push("Zelfde dag verzonden");
  }

  const hasWcDescription =
    Boolean(product.wcShortDescriptionHtml?.trim()) ||
    Boolean(product.wcDescriptionHtml?.trim());

  const origin = siteOrigin();
  const jsonLd = productJsonLd(product, origin, { variationId: resolvedInitialVariationId });
  const breadcrumbLd = productBreadcrumbJsonLd(product, origin, {
    categoryName: productCategory?.label,
    categoryPath: productCategory?.href,
  });
  const inStock = isProductInStock(product);
  const contentTier = resolveProductContentTier(product);

  const catalogSpecsFallback = (
    <p className="mt-2 text-sm text-[var(--foreground)]/85">
      Voor maten, materiaal of andere technische details kun je contact opnemen via de{" "}
      <Link href="/contact" className="font-semibold text-[#96741f] underline underline-offset-2">
        contact
      </Link>
      .
    </p>
  );

  return (
    <main
      className="min-h-screen bg-[#faf8f5] pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
      data-product-id={product.id}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <ProductTikTokView product={product} />
      <TrustBar />
      <Header />

      <section className="mx-auto w-full max-w-[1440px] px-4 py-6 md:py-10">
        <nav className="text-sm text-[var(--foreground)]/80" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/shop" className="font-semibold text-[#96741f] hover:underline">
                Webshop
              </Link>
            </li>
            {productCategory ? (
              <>
                <li aria-hidden className="text-[var(--foreground)]/45">
                  /
                </li>
                <li>
                  <Link href={productCategory.href} className="font-semibold text-[#96741f] hover:underline">
                    {productCategory.label}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden className="text-[var(--foreground)]/45">
              /
            </li>
            <li className="font-medium text-[var(--foreground)]" aria-current="page">
              {product.name}
            </li>
          </ol>
        </nav>

        <ProductVariationProvider product={product} initialVariationId={resolvedInitialVariationId}>
        <div className="mt-4 grid gap-6 md:gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <ProductImageGallery
              images={product.images}
              name={product.name}
              initialHighlightImage={initialVariationImage || undefined}
            />
          </div>

          <div className="rounded-2xl border border-[#e5dcc8] bg-white p-4 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]">
              {product.brand || "Bergasports"}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--foreground)] md:text-3xl">
              {product.name}
            </h1>
            {inStock ? (
              <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
                Op voorraad
              </p>
            ) : (
              <p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                Niet op voorraad
              </p>
            )}

            <p className="mt-2 text-sm text-[var(--foreground)]/70">Categorie: {product.category}</p>

            {!product.landingPromo ? (
              <>
                <div className="mt-6 flex items-end gap-3">
                  <span className="text-3xl font-bold text-[var(--foreground)]">
                    {formatProductCardPrice(product)}
                  </span>
                  {!product.wcVariations?.length && product.oldPrice ? (
                    <span className="text-lg text-[var(--foreground)]/50 line-through">
                      {formatProductPrice(product.oldPrice, product.currency)}
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 space-y-2 text-sm text-[var(--foreground)]/90">
                  {product.discount ? <p>Korting: {product.discount}%</p> : null}
                  {product.freeCargo ? <p>Gratis verzending beschikbaar</p> : null}
                  {product.sameDayShipping ? <p>Zelfde dag verzonden</p> : null}
                  {product.hasFastDeliveryTag ? <p>Snelle levering</p> : null}
                  {product.hasFlashSaleTag ? <p>Flash-aanbieding</p> : null}
                  {product.socialProof ? <p>{product.socialProof}</p> : null}
                </div>
              </>
            ) : null}

            <div className="mt-6 rounded-xl border border-[#e5dcc8] bg-[#faf8f4] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Betaalmethoden</p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)]/85">
                <li>iDEAL · Apple Pay · Google Pay · Visa / Mastercard · Bancontact</li>
                <li>Veilig via Mollie</li>
              </ul>
            </div>

            <ShopDeliveryTrustPanel className="mt-4" freeCargo={product.freeCargo} currency={product.currency} />

            {contentTier !== "small" ? (
              <div className="mt-6 rounded-xl border border-[#e5dcc8] bg-white p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">Belangrijkste kenmerken</p>
                <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)]/85">
                  {highlightedFeatures.map((feature) => (
                    <li key={feature}>- {feature}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {product.landingPromo ? (
              <ProductLandingPromo product={product} />
            ) : (
              <ProductPurchaseActions
                product={product}
                initialVariationId={resolvedInitialVariationId}
              />
            )}

            <div className="mt-6 rounded-xl border border-[#e5dcc8] bg-white p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Persoonlijk advies</p>
              <p className="mt-2 text-sm text-[var(--foreground)]/80">
                Twijfel je tussen modellen of maten? We helpen je graag in Dedemsvaart.
              </p>
              <Link
                href="/contact"
                className="mt-3 inline-flex min-h-11 items-center text-xs font-bold uppercase tracking-wider text-[#96741f] underline"
              >
                Plan een afspraak
              </Link>
            </div>
          </div>
        </div>
        </ProductVariationProvider>

        {contentTier === "premium" ? (
          <div className="mt-8 rounded-2xl border border-[#e5dcc8] bg-white p-4 md:p-6">
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold md:text-2xl">
              Waarom deze fiets?
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--foreground)]/85">
              <li>Geselecteerd op performance, pasvorm en rijstijl.</li>
              <li>Persoonlijk advies over maat, groepset en wielkeuze.</li>
              <li>Montage en afstelling mogelijk in onze werkplaats.</li>
            </ul>
            <h3 className="mt-6 text-lg font-semibold">Voor wie is dit geschikt?</h3>
            <p className="mt-2 text-sm text-[var(--foreground)]/80">
              Voor renners die kwaliteit zoeken en materiaal willen dat past bij training, wedstrijd of lange ritten.
            </p>
          </div>
        ) : null}

        {contentTier !== "small" ? (
        <div className="mt-10 rounded-2xl border border-[#e5dcc8] bg-white p-4 md:mt-12 md:p-6">
          <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[var(--foreground)] md:text-2xl">
            Productdetails
          </h2>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Productbeschrijving</h3>
              {product.wcShortDescriptionHtml ? (
                <WcHtmlBlock html={product.wcShortDescriptionHtml} className="mt-2" />
              ) : null}
              {product.wcDescriptionHtml ? (
                <WcHtmlBlock html={product.wcDescriptionHtml} className="mt-4" />
              ) : null}
              {!hasWcDescription ? catalogSpecsFallback : null}
              {product.wcShortDescriptionHtml && !product.wcDescriptionHtml ? (
                <div className="mt-4 border-t border-[#e5dcc8] pt-4">{catalogSpecsFallback}</div>
              ) : null}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Specificaties</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--foreground)]/85">
                <li>Product verkocht en geleverd door {product.brand || "Bergasports"}.</li>
                <li>
                  Productcode: {product.wcSku ? `${product.wcSku} (ID ${product.id})` : product.id}
                </li>
                {product.wcProductType ? <li>Type: {product.wcProductType}</li> : null}
                {product.wcAverageRating ? (
                  <li>
                    Gemiddelde beoordeling: {product.wcAverageRating}
                    {typeof product.wcReviewCount === "number" ? ` (${product.wcReviewCount} reviews)` : null}
                  </li>
                ) : null}
                {product.wcCategories?.length ? (
                  <li>
                    Categorieën: {product.wcCategories.map((c) => c.name).filter(Boolean).join(", ")}
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
        ) : hasWcDescription ? (
          <div className="mt-8 rounded-2xl border border-[#e5dcc8] bg-white p-4 md:p-6">
            {product.wcShortDescriptionHtml ? (
              <WcHtmlBlock html={product.wcShortDescriptionHtml} />
            ) : null}
            {product.wcDescriptionHtml ? (
              <WcHtmlBlock html={product.wcDescriptionHtml} className="mt-4" />
            ) : null}
          </div>
        ) : null}

        {similarProducts.length > 0 ? (
          <div className="mt-10 md:mt-12">
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[var(--foreground)] md:text-2xl">
              Vergelijkbare producten
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
              {similarProducts.map((item, index) => (
                <ShopProductCard key={item.id} product={item} priority={false} />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <Footer />
    </main>
  );
}
