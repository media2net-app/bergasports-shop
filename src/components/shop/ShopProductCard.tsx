"use client";

import LocalizedLink from "@/components/locale/LocalizedLink";

import ShopProductCardVariationChips from "@/components/shop/ShopProductCardVariationChips";
import OptimizedProductImage, {
  type OptimizedProductImageVariant,
} from "@/components/ui/OptimizedProductImage";
import { useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import { dutchLabelFromImportedName } from "@/lib/category-meta";
import { isShopNameBrand } from "@/lib/brands-shared";
import { ui } from "@/lib/i18n/ui";
import { productPath } from "@/lib/product-slug";
import { formatProductCardPrice, formatProductPrice, isProductInStock, type Product } from "@/lib/products";

type CatalogBadge = { label: string; className: string };

type Props = {
  product: Product;
  catalogBadge?: CatalogBadge | null;
  ctaLabel?: string;
  className?: string;
  /** Eager-load + high priority for above-the-fold cards (LCP). */
  priority?: boolean;
  imageVariant?: OptimizedProductImageVariant;
};

export default function ShopProductCard({
  product,
  catalogBadge,
  ctaLabel,
  className = "",
  priority = false,
  imageVariant = "card",
}: Props) {
  const { locale } = useShopLocale();
  const t = ui(locale);
  const resolvedCta = ctaLabel ?? t.viewProduct;
  const href = productPath(product);
  const inStock = isProductInStock(product);

  return (
    <article
      className={`card-lift group flex h-full flex-col overflow-hidden rounded-2xl border border-[#e5dcc8] bg-white hover:border-[var(--brand)]/45 ${!inStock ? "opacity-75" : ""} ${className}`}
    >
      <LocalizedLink
        href={href}
        className="flex min-h-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B38F27]"
      >
        <div className="p-3 pb-0">
          <OptimizedProductImage
            src={product.image}
            alt={product.name}
            variant={imageVariant}
            priority={priority}
            className="media-zoom object-contain"
            wrapperClassName="shrink-0 rounded-xl border-0"
          />
        </div>

        <div className="flex flex-1 flex-col p-4 pt-3">
          {!inStock ? (
            <span className="mb-2 inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900">
              {t.outOfStock}
            </span>
          ) : product.tag ? (
            <span className="mb-2 inline-flex w-fit rounded-full bg-[#f0ead8] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--brand-dark)]">
              {product.tag}
            </span>
          ) : null}

          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground)]/60">
            {product.brand && !isShopNameBrand(product.brand)
              ? product.brand
              : dutchLabelFromImportedName(product.category)}
          </p>

          {catalogBadge ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${catalogBadge.className}`}
              >
                {catalogBadge.label}
              </span>
            </div>
          ) : null}

          <h2 className="title-3-lines mt-1 text-[15px] font-semibold leading-snug text-[var(--foreground)] transition-colors group-hover:text-[#96741f] sm:text-base">
            {product.name}
          </h2>

          <div className="mt-auto flex items-baseline gap-2 pt-3">
            <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">
              {formatProductCardPrice(product)}
            </span>
            {product.oldPrice && !product.wcVariations?.length ? (
              <span className="text-sm text-[var(--foreground)]/50 line-through">
                {formatProductPrice(product.oldPrice, product.currency)}
              </span>
            ) : null}
          </div>
        </div>
      </LocalizedLink>

      <div className="px-4 pb-4">
        <ShopProductCardVariationChips product={product} />

        {inStock ? (
          <LocalizedLink
            href={href}
            className="mt-3 block w-full rounded-full bg-[#B38F27] px-4 py-2.5 text-center text-sm font-semibold text-white transition duration-300 group-hover:bg-[#96741f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B38F27] focus-visible:ring-offset-2"
          >
            {resolvedCta}
          </LocalizedLink>
        ) : (
          <span className="mt-3 block w-full rounded-full border border-[#e5dcc8] bg-[#faf9fc] px-4 py-2.5 text-center text-sm font-semibold text-[var(--foreground)]/60">
            {t.outOfStock}
          </span>
        )}
      </div>
    </article>
  );
}
