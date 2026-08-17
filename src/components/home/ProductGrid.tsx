import SectionHeading from "@/components/home/SectionHeading";
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
      <SectionHeading
        eyebrow="Uitgelicht"
        title="Populaire producten"
        text="Een selectie uit ons assortiment — met persoonlijk advies en vakkundige opbouw in Dedemsvaart."
      />
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {featuredProducts.map((product) => (
          <ShopProductCard
            key={product.id}
            product={product}
            priority={false}
            imageVariant={compactImages ? "homeCard" : "card"}
          />
        ))}
      </div>
    </section>
  );
}
