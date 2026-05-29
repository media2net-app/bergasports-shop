import { productPath } from "@/lib/product-slug";
import { formatProductCardPrice, type Product } from "@/lib/products";
import { SITE_BRAND_SHORT } from "@/lib/site-brand";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function productMetaDescription(product: Product): string {
  const fromShort = product.wcShortDescriptionHtml
    ? stripHtml(product.wcShortDescriptionHtml)
    : "";
  if (fromShort.length >= 40) {
    return fromShort.slice(0, 155);
  }
  const price = formatProductCardPrice(product);
  return `${product.name} — ${price}. Bestel online bij ${SITE_BRAND_SHORT} met levering in Nederland en België.`;
}

export type ProductJsonLdOptions = {
  variationId?: number;
  categoryName?: string;
};

export function productJsonLd(product: Product, siteUrl: string, options?: ProductJsonLdOptions) {
  const base = siteUrl.replace(/\/$/, "");
  const url = `${base}${productPath(product)}`;
  const images =
    product.images.length > 0 ? product.images : product.image ? [product.image] : [];

  const variation =
    options?.variationId != null
      ? product.wcVariations?.find((v) => v.id === options.variationId)
      : undefined;

  const offerPrice = variation?.price ?? product.price;
  const offerSku = variation?.sku || product.wcSku || String(product.id);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: images,
    description: productMetaDescription(product),
    sku: offerSku,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : { "@type": "Brand", name: SITE_BRAND_SHORT },
    offers: {
      "@type": "Offer",
      url: variation ? `${url}?variation=${variation.id}` : url,
      priceCurrency: product.currency === "Lei" ? "RON" : product.currency,
      price: offerPrice.toFixed(2),
      availability:
        product.inStock === false
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

export function productBreadcrumbJsonLd(
  product: Product,
  siteUrl: string,
  options?: { categoryName?: string; categoryPath?: string },
) {
  const base = siteUrl.replace(/\/$/, "");
  const items: { "@type": string; position: number; name: string; item?: string }[] = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
    { "@type": "ListItem", position: 2, name: "Webshop", item: `${base}/shop` },
  ];

  if (options?.categoryName && options.categoryPath) {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: options.categoryName,
      item: `${base}${options.categoryPath}`,
    });
    items.push({
      "@type": "ListItem",
      position: 4,
      name: product.name,
      item: `${base}${productPath(product)}`,
    });
  } else {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: product.name,
      item: `${base}${productPath(product)}`,
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}
