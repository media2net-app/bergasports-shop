/** WooCommerce Store API bron voor product-import (bergasports.com). */
export function getWcStoreBaseUrl(): string {
  const raw =
    process.env.WC_STORE_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_WC_STORE_BASE_URL?.trim() ||
    "https://www.bergasports.com";
  return raw.replace(/\/$/, "");
}

export function wcStoreProductsEndpoint(): string {
  return `${getWcStoreBaseUrl()}/wp-json/wc/store/v1/products`;
}

export function wcProductCategoriesEndpoint(): string {
  return `${getWcStoreBaseUrl()}/wp-json/wp/v2/product_cat`;
}
