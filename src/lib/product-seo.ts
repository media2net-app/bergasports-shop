import { productPath } from "@/lib/product-slug";
import {
  decodeImportedProductTitle,
  formatProductCardPrice,
  type Product,
} from "@/lib/products";
import { SITE_BRAND_SHORT } from "@/lib/site-brand";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Zoekterm per categorie, voor een titel die verder komt dan alleen de productnaam. */
const CATEGORY_KEYWORDS: { match: RegExp; keyword: string }[] = [
  { match: /road|race/i, keyword: "racefiets" },
  { match: /gravel/i, keyword: "gravelbike" },
  { match: /mtb|mountain/i, keyword: "mountainbike" },
  { match: /skate|skeeler/i, keyword: "skeelers" },
  { match: /wheel|wiel|scope/i, keyword: "wielset" },
  { match: /shoe|schoen/i, keyword: "wielrenschoenen" },
  { match: /helmet|helm/i, keyword: "fietshelm" },
  { match: /glass|bril/i, keyword: "sportbril" },
  { match: /wear|kleding|lafuga/i, keyword: "fietskleding" },
  { match: /cleat|schoenplaat/i, keyword: "schoenplaatjes" },
  { match: /group|groepset/i, keyword: "groepset" },
];

function productKeyword(product: Product): string | null {
  const haystack = `${product.category ?? ""} ${product.name}`;
  for (const { match, keyword } of CATEGORY_KEYWORDS) {
    if (match.test(haystack)) {
      return keyword;
    }
  }
  return null;
}

/**
 * SEO-titel uit productnaam + merk + zoekterm, afgekapt op wat Google toont.
 * Zodra er een SEO-veld in de admin staat, gaat die waarde hier vóór.
 */
const MAX_TITLE_LENGTH = 65;

function shortenToWords(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export function productSeoTitle(product: Product): string {
  const custom = product.seoTitle?.trim();
  if (custom) {
    return custom;
  }
  const name = decodeImportedProductTitle(product.name).trim() || product.name;
  const brand = product.brand?.trim();
  /* Het eigen merk voegt niets toe: dat staat al in de suffix. */
  const useBrand =
    brand &&
    !name.toLowerCase().includes(brand.toLowerCase()) &&
    brand.toLowerCase() !== SITE_BRAND_SHORT.toLowerCase();
  const withBrand = useBrand ? `${name} ${brand}` : name;
  const keyword = productKeyword(product);
  const suffix = ` | ${SITE_BRAND_SHORT}`;

  const candidates = [
    keyword && !withBrand.toLowerCase().includes(keyword)
      ? `${withBrand} ${keyword} kopen${suffix}`
      : null,
    `${withBrand} kopen${suffix}`,
    `${withBrand}${suffix}`,
  ].filter((v): v is string => Boolean(v));

  const fits = candidates.find((title) => title.length <= MAX_TITLE_LENGTH);
  if (fits) {
    return fits;
  }
  return `${shortenToWords(withBrand, MAX_TITLE_LENGTH - suffix.length)}${suffix}`;
}

export function productMetaDescription(product: Product): string {
  const custom = product.seoDescription?.trim();
  if (custom) {
    return custom.slice(0, 160);
  }
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
  path?: string;
};

export function productJsonLd(product: Product, siteUrl: string, options?: ProductJsonLdOptions) {
  const base = siteUrl.replace(/\/$/, "");
  const url = `${base}${options?.path ?? productPath(product)}`;
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
  options?: {
    categoryName?: string;
    categoryPath?: string;
    productPath?: string;
    shopPath?: string;
    homePath?: string;
  },
) {
  const base = siteUrl.replace(/\/$/, "");
  const productHref = options?.productPath ?? productPath(product);
  const shopHref = options?.shopPath ?? "/shop";
  const homeHref = options?.homePath ?? "/";
  const items: { "@type": string; position: number; name: string; item?: string }[] = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${base}${homeHref}` },
    { "@type": "ListItem", position: 2, name: "Webshop", item: `${base}${shopHref}` },
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
      item: `${base}${productHref}`,
    });
  } else {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: product.name,
      item: `${base}${productHref}`,
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}
