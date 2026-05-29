import ShopProductCard from "@/components/shop/ShopProductCard";
import { loadFeaturedProducts } from "@/lib/products-db";
import type { Product } from "@/lib/products";

type ProductGridProps = {
  products?: Product[];
  /** Smaller images, never priority — homepage below hero (LCP). */
  compactImages?: boolean;
};

export default async function ProductGrid({ products, compactImages = false }: ProductGridProps) {
  const featuredProducts =
    products && products.length > 0 ? products : await loadFeaturedProducts(compactImages ? 4 : 8);

  if (featuredProducts.length === 0) {
    return null;
  }

  return (
    <section id="oferte" className="w-full">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-semibold text-[var(--foreground)] md:font-[family-name:var(--font-heading)] md:text-3xl">
          Populaire producten
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {featuredProducts.map((product) => (
          <ShopProductCard
            key={product.id}
            product={product}
            className="p-5 transition hover:-translate-y-0.5"
            priority={false}
            imageVariant={compactImages ? "homeCard" : "card"}
          />
        ))}
      </div>
    </section>
  );
}
