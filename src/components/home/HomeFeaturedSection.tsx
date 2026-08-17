import Link from "next/link";

import ProductGrid from "@/components/home/ProductGrid";
import { loadFeaturedProducts } from "@/lib/products-db";

/** Loaded inside Suspense so hero HTML can paint before featured products query (mobile LCP). */
export default async function HomeFeaturedSection() {
  let products: Awaited<ReturnType<typeof loadFeaturedProducts>> = [];
  try {
    products = await loadFeaturedProducts(6);
  } catch {
    products = [];
  }
  return (
    <>
      <ProductGrid products={products} compactImages />
      {products.length > 0 ? (
        <p className="text-center">
          <Link
            href="/shop"
            className="group inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--brand)]/40 bg-white px-7 text-sm font-semibold text-[#96741f] transition duration-300 hover:border-[var(--brand)] hover:bg-[var(--brand-surface-alt)]"
          >
            Bekijk alle producten in de webshop
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </p>
      ) : null}
    </>
  );
}
