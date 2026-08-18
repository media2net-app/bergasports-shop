import { decodeImportedProductTitle, type Product } from "@/lib/products";

function haystack(product: Pick<Product, "name" | "category" | "brand">): string {
  return `${product.name} ${product.category} ${product.brand ?? ""}`.toLowerCase();
}

export function isHomeBikeProduct(product: Pick<Product, "name" | "category" | "brand">): boolean {
  if (/(road bike|gravelbike|gravel bike|^bikes$|^mtb$|^fietsen$|racefietsen)/i.test(product.category)) {
    return true;
  }
  return /\b(racefiets|road bike|gravel|mtb|mountainbike|hardtail)\b/i.test(haystack(product));
}

export function isHomeNimblProduct(product: Pick<Product, "name" | "category" | "brand">): boolean {
  if (/cycling shoes|wielrenschoenen/i.test(product.category)) return true;
  return /\bnimbl\b/i.test(haystack(product));
}

export function sortHomeCollection(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    if (Boolean(b.featuredOnHomepage) !== Boolean(a.featuredOnHomepage)) {
      return a.featuredOnHomepage ? -1 : 1;
    }
    return decodeImportedProductTitle(a.name).localeCompare(decodeImportedProductTitle(b.name), "nl");
  });
}
