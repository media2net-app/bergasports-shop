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
            className="text-sm font-semibold text-[#96741f] underline underline-offset-2"
          >
            Bekijk alle producten in de webshop →
          </Link>
        </p>
      ) : null}
    </>
  );
}
