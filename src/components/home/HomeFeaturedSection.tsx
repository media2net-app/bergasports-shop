import HomeProductCollections from "@/components/home/HomeProductCollections";
import ShopProductCard from "@/components/shop/ShopProductCard";
import { isHomeBikeProduct, isHomeNimblProduct, sortHomeCollection } from "@/lib/home-collections";
import { isProductInStock } from "@/lib/products";
import { loadCatalogProducts } from "@/lib/products-db";
import { BERGASPORTS_CATEGORY_PATHS } from "@/lib/site-content";

function CollectionGrid({ products }: { products: Awaited<ReturnType<typeof loadCatalogProducts>> }) {
  if (products.length === 0) {
    return <p className="text-sm text-[var(--foreground)]/70">Nog geen producten in deze collectie.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {products.map((product) => (
        <ShopProductCard key={product.id} product={product} priority={false} imageVariant="homeCard" />
      ))}
    </div>
  );
}

export default async function HomeFeaturedSection() {
  let catalog: Awaited<ReturnType<typeof loadCatalogProducts>> = [];
  try {
    catalog = (await loadCatalogProducts()).filter((p) => isProductInStock(p));
  } catch {
    catalog = [];
  }

  const fietsen = sortHomeCollection(catalog.filter(isHomeBikeProduct)).slice(0, 4);
  const nimbl = sortHomeCollection(catalog.filter(isHomeNimblProduct)).slice(0, 4);

  if (fietsen.length === 0 && nimbl.length === 0) {
    return null;
  }

  return (
    <HomeProductCollections
      fietsenHref={BERGASPORTS_CATEGORY_PATHS.bikes}
      nimblHref={BERGASPORTS_CATEGORY_PATHS.cyclingShoes}
      fietsenGrid={<CollectionGrid products={fietsen} />}
      nimblGrid={<CollectionGrid products={nimbl} />}
    />
  );
}
