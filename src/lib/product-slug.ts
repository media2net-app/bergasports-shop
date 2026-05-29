import { decodeImportedProductTitle, type Product, type TrendyolJsonProduct } from "@/lib/products";

/** SEO slug from product title (Romanian diacritics → ASCII). */
export function slugifyProductTitle(title: string): string {
  return decodeImportedProductTitle(title)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function productSlugBase(product: Pick<TrendyolJsonProduct, "name" | "id">): string {
  const fromTitle = slugifyProductTitle(product.name);
  if (fromTitle) {
    return fromTitle;
  }
  return `product-${product.id}`;
}

/** Canonical slug stored on the product (title-based by default). */
export function resolveProductSlug(
  product: Pick<TrendyolJsonProduct, "slug" | "wcSlug" | "name" | "id">,
): string {
  const stored = product.slug?.trim().toLowerCase();
  if (stored) {
    return slugifyProductTitle(stored) || stored;
  }
  return productSlugBase(product);
}

export function productPath(slugOrProduct: string | Pick<Product, "slug">): string {
  const slug = typeof slugOrProduct === "string" ? slugOrProduct : slugOrProduct.slug;
  return `/product/${slug}`;
}

export function isNumericProductPathSegment(segment: string): boolean {
  return /^\d+$/.test(segment.trim());
}

/**
 * Pick a unique slug among existing products (slug → product id).
 * On collision appends -2, -3, …; final fallback uses product id.
 */
export function uniqueProductSlug(
  base: string,
  productId: number,
  usedBySlug: Map<string, number>,
): string {
  const root = slugifyProductTitle(base) || `product-${productId}`;
  const existing = usedBySlug.get(root);
  if (existing === undefined || existing === productId) {
    return root;
  }

  for (let n = 2; n < 500; n++) {
    const candidate = `${root}-${n}`;
    const owner = usedBySlug.get(candidate);
    if (owner === undefined || owner === productId) {
      return candidate;
    }
  }

  return `product-${productId}`;
}

export function buildSlugRegistry(
  products: Pick<TrendyolJsonProduct, "id" | "slug" | "wcSlug" | "name">[],
): Map<string, number> {
  const used = new Map<string, number>();
  const sorted = [...products].sort((a, b) => a.id - b.id);

  for (const p of sorted) {
    const base = productSlugBase(p);
    const slug = uniqueProductSlug(base, p.id, used);
    used.set(slug, p.id);
  }

  return used;
}

/** Assign `slug` on raw product JSON before persistence. */
export function withProductSlug(
  product: TrendyolJsonProduct,
  allProducts: TrendyolJsonProduct[],
): TrendyolJsonProduct {
  const used = buildSlugRegistry(allProducts.filter((p) => p.id !== product.id));
  const base = productSlugBase(product);
  const slug = uniqueProductSlug(base, product.id, used);
  return { ...product, slug };
}
