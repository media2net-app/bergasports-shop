import type { Metadata } from "next";
import LocalizedLink from "@/components/locale/LocalizedLink";
import { notFound, permanentRedirect } from "next/navigation";
import ProductTikTokView from "@/components/analytics/ProductTikTokView";
import ShopProductCard from "@/components/shop/ShopProductCard";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import ProductLandingPromo from "@/components/product/ProductLandingPromo";
import ProductPriceBlock from "@/components/product/ProductPriceBlock";
import ProductPurchaseActions from "@/components/product/ProductPurchaseActions";
import ProductTrustRow from "@/components/product/ProductTrustRow";
import { ProductVariationProvider } from "@/components/product/ProductVariationContext";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { SITE_DEFAULT_URL } from "@/lib/site-brand";
import { isNumericProductPathSegment, productPath } from "@/lib/product-slug";
import { loadRalexCategories } from "@/lib/categories-db";
import { loadCatalogProducts, loadProductFromPathSegment } from "@/lib/products-db";
import { followSeoRedirect } from "@/lib/seo-redirects";
import { getRequestLocale, localizedPublicPath } from "@/lib/i18n/locale";
import { ui } from "@/lib/i18n/ui";
import {
  productMatchesShopCategory,
  resolveProductShopCategory,
  resolveShopCategoryMatch,
} from "@/lib/shop-category-filter";
import { categoryDisplayName, englishLabelFromImportedName, dutchLabelFromImportedName } from "@/lib/category-meta";
import { isShopNameBrand } from "@/lib/brands-shared";
import { isProductInStock } from "@/lib/products";
import {
  productBreadcrumbJsonLd,
  productJsonLd,
  productMetaDescription,
  productSeoTitle,
} from "@/lib/product-seo";
import { buildPageMetadata } from "@/lib/seo";
import { resolveProductContentTier } from "@/lib/product-content-tier";
import { DEFAULT_FREE_SHIPPING_THRESHOLD_EUR, meetsFreeShippingThreshold } from "@/lib/shop-delivery-trust";
import { getFreeShippingThresholdSetting } from "@/lib/shop-runtime";

export const dynamic = "force-dynamic";

function siteOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) {
    return env.replace(/\/$/, "");
  }
  return SITE_DEFAULT_URL;
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

const PAYMENT_METHODS = ["iDEAL", "Apple Pay", "Google Pay", "Visa", "Mastercard", "Bancontact"];

function SellingPointBadge({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "good" }) {
  const toneClass =
    tone === "good"
      ? "border-[#166534]/25 bg-[#166534]/10 text-[#166534]"
      : "border-[var(--brand-border)] bg-[var(--brand-surface-alt)] text-[var(--foreground)]/80";
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-[var(--brand-border)] py-2.5 last:border-b-0">
      <dt className="text-sm text-[var(--foreground)]/60">{label}</dt>
      <dd className="text-sm font-semibold text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function RatingStars({
  rating,
  count,
  reviewsLabel,
}: {
  rating: string;
  count?: number;
  reviewsLabel: (n: number) => string;
}) {
  const value = Number.parseFloat(rating);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  const rounded = Math.round(value);
  return (
    <p className="mt-2 flex items-center gap-2 text-sm">
      <span className="text-[var(--brand-mid)]" aria-hidden>
        {"★".repeat(rounded)}
        <span className="text-[var(--foreground)]/20">{"★".repeat(Math.max(0, 5 - rounded))}</span>
      </span>
      <span className="text-[var(--foreground)]/70">
        {value.toFixed(1)}
        {typeof count === "number" && count > 0 ? ` · ${reviewsLabel(count)}` : ""}
      </span>
    </p>
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
  const [product, locale] = await Promise.all([
    loadProductFromPathSegment(segment),
    getRequestLocale(),
  ]);
  if (!product) {
    await followSeoRedirect(`/product/${segment}`);
    return { title: ui(locale).productNotFound };
  }
  return buildPageMetadata({
    absoluteTitle: productSeoTitle(product, locale),
    description: productMetaDescription(product, locale),
    path: await localizedPublicPath(productPath(product)),
    image: product.socialImage?.trim() || product.image,
    imageAlt: product.imageAlt?.trim() || product.name,
    noindex: Boolean(product.noindex),
    ogTitle: product.ogTitle,
    ogDescription: product.ogDescription,
  });
}

export default async function ProductDetailPage({ params, searchParams }: ProductDetailPageProps) {
  const { slug: segment } = await params;
  const sp = (await searchParams) ?? {};

  if (isNumericProductPathSegment(segment)) {
    const legacy = await loadProductFromPathSegment(segment);
    if (!legacy) {
      notFound();
    }
    permanentRedirect(await localizedPublicPath(`${productPath(legacy)}${variationQuery(sp)}`));
  }

  const product = await loadProductFromPathSegment(segment);
  if (!product) {
    await followSeoRedirect(`/product/${segment}`);
    notFound();
  }

  const variationRaw = typeof sp.variation === "string" ? Number.parseInt(sp.variation, 10) : NaN;
  const initialVariationId =
    Number.isFinite(variationRaw) && variationRaw > 0 ? variationRaw : undefined;

  const [catalog, categoriesFile, freeShippingThreshold, locale] = await Promise.all([
    loadCatalogProducts(),
    loadRalexCategories(),
    getFreeShippingThresholdSetting().catch(() => DEFAULT_FREE_SHIPPING_THRESHOLD_EUR),
    getRequestLocale(),
  ]);
  const t = ui(locale);
  const productCategory = resolveProductShopCategory(product, categoriesFile.tree, locale);
  const categoryEyebrow = (raw: string) =>
    locale === "en" ? englishLabelFromImportedName(null, raw) : dutchLabelFromImportedName(raw);

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

  const sellingPoints: { label: string; tone: "neutral" | "good" }[] = [];
  if (product.discount) {
    sellingPoints.push({ label: t.percentOff(product.discount), tone: "good" });
  }
  if (meetsFreeShippingThreshold(product.price, freeShippingThreshold)) {
    sellingPoints.push({ label: t.freeShippingNlBadge, tone: "good" });
  }
  if (product.sameDayShipping) {
    sellingPoints.push({ label: t.sameDayShipping, tone: "good" });
  }
  if (product.hasFastDeliveryTag) {
    sellingPoints.push({ label: t.fastDelivery, tone: "neutral" });
  }
  if (product.hasFlashSaleTag) {
    sellingPoints.push({ label: t.flashSale, tone: "neutral" });
  }
  if (product.socialProof) {
    sellingPoints.push({ label: product.socialProof, tone: "neutral" });
  }

  const hasWcDescription =
    Boolean(product.wcShortDescriptionHtml?.trim()) ||
    Boolean(product.wcDescriptionHtml?.trim());

  const origin = siteOrigin();
  const [publicProductPath, publicShopPath, publicHomePath, publicCategoryPath] = await Promise.all([
    localizedPublicPath(productPath(product)),
    localizedPublicPath("/shop"),
    localizedPublicPath("/"),
    productCategory ? localizedPublicPath(productCategory.href) : Promise.resolve(undefined),
  ]);
  const jsonLd = productJsonLd(product, origin, {
    variationId: resolvedInitialVariationId,
    path: publicProductPath,
    locale,
  });
  const breadcrumbLd = productBreadcrumbJsonLd(product, origin, {
    categoryName: productCategory?.label,
    categoryPath: publicCategoryPath,
    productPath: publicProductPath,
    shopPath: publicShopPath,
    homePath: publicHomePath,
    shopName: t.webshop,
  });
  const inStock = isProductInStock(product);
  const contentTier = resolveProductContentTier(product);

  const catalogSpecsFallback = (
    <p className="mt-2 text-sm text-[var(--foreground)]/85">
      {t.specsContactFallbackPrefix}{" "}
      <LocalizedLink href="/contact" className="font-semibold text-[#96741f] underline underline-offset-2">
        {t.specsContactFallbackLink}
      </LocalizedLink>
      {t.specsContactFallbackSuffix}
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
      <Header />

      <section className="mx-auto w-full max-w-[1440px] px-4 py-5 md:py-8 lg:px-6">
        <nav className="text-sm" aria-label={t.breadcrumbAria}>
          <ol className="flex flex-wrap items-center gap-1.5 text-[var(--foreground)]/60">
            <li>
              <LocalizedLink href="/shop" className="transition-colors hover:text-[var(--brand)]">
                {t.webshop}
              </LocalizedLink>
            </li>
            {productCategory ? (
              <>
                <li aria-hidden>/</li>
                <li>
                  <LocalizedLink
                    href={productCategory.href}
                    className="transition-colors hover:text-[var(--brand)]"
                  >
                    {productCategory.label}
                  </LocalizedLink>
                </li>
              </>
            ) : null}
            <li aria-hidden>/</li>
            <li className="font-semibold text-[var(--foreground)]" aria-current="page">
              {product.name}
            </li>
          </ol>
        </nav>

        <ProductVariationProvider product={product} initialVariationId={resolvedInitialVariationId}>
          <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Galerij blijft in beeld tijdens scrollen */}
            <div className="lg:col-span-7 lg:sticky lg:top-28 lg:self-start">
              <ProductImageGallery
                images={product.images}
                name={product.name}
                initialHighlightImage={initialVariationImage || undefined}
              />
            </div>

            {/* Koopkolom: titel → prijs → CTA binnen één schermhoogte */}
            <div className="lg:col-span-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
                {product.brand && !isShopNameBrand(product.brand)
                  ? product.brand
                  : categoryEyebrow(product.category)}
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">
                {product.name}
              </h1>
              {product.wcAverageRating ? (
                <RatingStars
                  rating={product.wcAverageRating}
                  count={product.wcReviewCount}
                  reviewsLabel={t.reviewsCount}
                />
              ) : null}

              {!product.landingPromo ? (
                <div className="mt-5">
                  <ProductPriceBlock product={product} />
                </div>
              ) : null}

              <p className="mt-4 flex items-center gap-2 text-sm font-semibold">
                <span
                  className={`h-2 w-2 rounded-full ${inStock ? "bg-[#16a34a]" : "bg-amber-500"}`}
                  aria-hidden
                />
                <span className={inStock ? "text-[#166534]" : "text-amber-700"}>
                  {inStock ? t.inStock : t.outOfStock}
                </span>
              </p>

              {sellingPoints.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {sellingPoints.map((point) => (
                    <SellingPointBadge key={point.label} tone={point.tone}>
                      {point.label}
                    </SellingPointBadge>
                  ))}
                </div>
              ) : null}

              <div className="mt-6">
                {product.landingPromo ? (
                  <ProductLandingPromo product={product} />
                ) : (
                  <ProductPurchaseActions
                    product={product}
                    initialVariationId={resolvedInitialVariationId}
                  />
                )}
              </div>

              <ProductTrustRow
                className="mt-7 border-t border-[var(--brand-border)] pt-6"
                freeCargo={meetsFreeShippingThreshold(product.price, freeShippingThreshold)}
                currency={product.currency}
                freeShippingThreshold={freeShippingThreshold}
              />

              <div className="mt-6 flex flex-wrap items-center gap-1.5">
                {PAYMENT_METHODS.map((method) => (
                  <span
                    key={method}
                    className="rounded-md border border-[var(--brand-border)] bg-white px-2 py-1 text-[11px] font-semibold text-[var(--foreground)]/70"
                  >
                    {method}
                  </span>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-5">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {t.sizeAdviceTitle}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--foreground)]/75">
                  {t.sizeAdviceText}
                </p>
                <LocalizedLink
                  href="/afspraak#formulier"
                  className="arrow-link mt-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#96741f]"
                >
                  {t.planAppointment}
                  <span aria-hidden className="arrow-link-icon">
                    →
                  </span>
                </LocalizedLink>
              </div>
            </div>
          </div>
        </ProductVariationProvider>

        {contentTier === "premium" ? (
          <div className="mt-12 grid gap-8 rounded-2xl border border-[var(--brand-border)] bg-white p-6 md:mt-14 md:p-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <h2 className="section-rule font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight md:text-2xl">
                {t.whyThisModel}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {[
                  t.whyLine1,
                  t.whyLine2,
                  t.whyLine3,
                ].map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-[var(--foreground)]/80"
                  >
                    <span className="mt-0.5 shrink-0 font-bold text-[var(--brand)]" aria-hidden>
                      ✓
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight">
                {t.whoIsThisFor}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]/80">
                {t.whoIsThisForText}
              </p>
            </div>
          </div>
        ) : null}

        {contentTier !== "small" ? (
          <div className="mt-12 grid gap-10 md:mt-14 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <h2 className="section-rule font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-[var(--foreground)] md:text-2xl">
                {t.productDescription}
              </h2>
              <div className="mt-4">
                {product.wcShortDescriptionHtml ? (
                  <WcHtmlBlock html={product.wcShortDescriptionHtml} />
                ) : null}
                {product.wcDescriptionHtml ? (
                  <WcHtmlBlock html={product.wcDescriptionHtml} className="mt-4" />
                ) : null}
                {!hasWcDescription ? catalogSpecsFallback : null}
                {product.wcShortDescriptionHtml && !product.wcDescriptionHtml
                  ? catalogSpecsFallback
                  : null}
              </div>
            </div>

            <div className="lg:col-span-5">
              <h2 className="section-rule font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-[var(--foreground)] md:text-2xl">
                {t.specifications}
              </h2>
              <dl className="mt-4 rounded-2xl border border-[var(--brand-border)] bg-white px-5 py-2">
                {product.specsText
                  ? product.specsText
                      .split(/\r?\n/)
                      .map((line) => line.trim())
                      .filter(Boolean)
                      .map((line) => {
                        const [label, ...rest] = line.split(":");
                        const value = rest.join(":").trim();
                        if (!value) return null;
                        return <SpecRow key={line} label={label.trim()} value={value} />;
                      })
                  : null}
                <SpecRow
                  label={t.productCode}
                  value={product.wcSku ? product.wcSku : String(product.id)}
                />
                {product.wcProductType ? (
                  <SpecRow label={t.productType} value={product.wcProductType} />
                ) : null}
                {product.wcAverageRating ? (
                  <SpecRow
                    label={t.rating}
                    value={`${product.wcAverageRating}${
                      typeof product.wcReviewCount === "number" && product.wcReviewCount > 0
                        ? ` (${t.reviewsCount(product.wcReviewCount)})`
                        : ""
                    }`}
                  />
                ) : null}
                {product.wcCategories?.length ? (
                  <SpecRow
                    label={t.categories}
                    value={product.wcCategories
                      .map((c) => categoryDisplayName(c.slug, c.name, locale))
                      .filter(Boolean)
                      .join(", ")}
                  />
                ) : (
                  <SpecRow label={t.category} value={categoryEyebrow(product.category)} />
                )}
              </dl>
            </div>
          </div>
        ) : hasWcDescription ? (
          <div className="mt-10 max-w-3xl">
            <h2 className="section-rule font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-[var(--foreground)] md:text-2xl">
              {t.productDescription}
            </h2>
            <div className="mt-4">
              {product.wcShortDescriptionHtml ? (
                <WcHtmlBlock html={product.wcShortDescriptionHtml} />
              ) : null}
              {product.wcDescriptionHtml ? (
                <WcHtmlBlock html={product.wcDescriptionHtml} className="mt-4" />
              ) : null}
            </div>
          </div>
        ) : null}

        {similarProducts.length > 0 ? (
          <div className="mt-12 md:mt-16">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="section-rule font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-[var(--foreground)] md:text-2xl">
                {t.similarProducts}
              </h2>
              <LocalizedLink
                href={productCategory?.href ?? "/shop"}
                className="arrow-link inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#96741f]"
              >
                {t.viewMore}
                <span aria-hidden className="arrow-link-icon">
                  →
                </span>
              </LocalizedLink>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
              {similarProducts.map((item) => (
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
