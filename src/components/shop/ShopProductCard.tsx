import Link from "next/link";

import ShopProductCardVariationChips from "@/components/shop/ShopProductCardVariationChips";
import OptimizedProductImage, {
  type OptimizedProductImageVariant,
} from "@/components/ui/OptimizedProductImage";
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
  ctaLabel = "Bekijk product",
  className = "",
  priority = false,
  imageVariant = "card",
}: Props) {
  const href = productPath(product);
  const inStock = isProductInStock(product);

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-[#e5dcc8] bg-white transition hover:shadow-md ${!inStock ? "opacity-75" : ""} ${className}`}
    >
      <Link
        href={href}
        className="flex min-h-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B38F27]"
      >
        <OptimizedProductImage
          src={product.image}
          alt={product.name}
          variant={imageVariant}
          priority={priority}
          className="object-contain"
          wrapperClassName="shrink-0 rounded-none border-0"
        />

        <div className="flex flex-1 flex-col p-4 pt-3">
          {!inStock ? (
            <span className="mb-2 inline-flex w-fit rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
              Niet op voorraad
            </span>
          ) : product.tag ? (
            <span className="mb-2 inline-flex w-fit rounded-full bg-[#f0ead8] px-2 py-1 text-xs font-semibold text-[var(--foreground)]">
              {product.tag}
            </span>
          ) : null}

          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground)]/70">
            {product.brand || product.category}
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

          <h2 className="title-3-lines mt-1 text-[15px] font-semibold leading-snug text-[var(--foreground)] group-hover:text-[#96741f] sm:text-base">
            {product.name}
          </h2>

          <div className="mt-auto flex items-baseline gap-2 pt-3">
            <span className="text-lg font-bold text-[var(--foreground)]">
              {formatProductCardPrice(product)}
            </span>
            {product.oldPrice && !product.wcVariations?.length ? (
              <span className="text-sm text-[var(--foreground)]/50 line-through">
                {formatProductPrice(product.oldPrice, product.currency)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4">
        <ShopProductCardVariationChips product={product} />

        {inStock ? (
          <Link
            href={href}
            className="mt-3 block w-full rounded-full bg-[#B38F27] px-4 py-2.5 text-center text-sm font-semibold text-white transition group-hover:bg-[#96741f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B38F27] focus-visible:ring-offset-2"
          >
            {ctaLabel}
          </Link>
        ) : (
          <span className="mt-3 block w-full rounded-full border border-[#e5dcc8] bg-[#faf9fc] px-4 py-2.5 text-center text-sm font-semibold text-[var(--foreground)]/60">
            Niet op voorraad
          </span>
        )}
      </div>
    </article>
  );
}
