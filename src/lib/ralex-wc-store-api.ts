import { wcStoreProductsEndpoint } from "@/lib/wc-store-config";

export type WcStoreImage = {
  id?: number;
  src: string;
  thumbnail?: string;
};

export type WcStoreProductPrices = {
  price: string;
  regular_price: string;
  sale_price: string;
  currency_code?: string;
  currency_minor_unit?: number;
  price_range?: { min_amount?: string; max_amount?: string };
};

export type WcStoreProductCategory = {
  id: number;
  name: string;
  slug: string;
};

export type WcStoreProductVariationRef = {
  id: number;
  attributes?: { name: string; value: string }[];
};

export type WcStoreProductAttribute = {
  id: number;
  name: string;
  taxonomy: string;
  has_variations?: boolean;
  terms?: { id: number; name: string; slug: string }[];
};

export type WcStoreProduct = {
  id: number;
  name: string;
  slug: string;
  sku?: string;
  permalink: string;
  parent?: number;
  type?: string;
  variation?: string;
  on_sale?: boolean;
  prices: WcStoreProductPrices;
  images?: WcStoreImage[];
  short_description?: string;
  description?: string;
  price_html?: string;
  average_rating?: string;
  review_count?: number;
  categories?: WcStoreProductCategory[];
  attributes?: WcStoreProductAttribute[];
  variations?: WcStoreProductVariationRef[];
};

export async function fetchWcStoreProductsPage(
  categoryId: number,
  page: number,
  perPage: number,
): Promise<{ products: WcStoreProduct[]; totalPages: number }> {
  const url = `${wcStoreProductsEndpoint()}?category=${categoryId}&per_page=${perPage}&page=${page}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`WooCommerce Store API ${r.status}: ${text.slice(0, 200)}`);
  }
  const products = (await r.json()) as WcStoreProduct[];
  if (!Array.isArray(products)) {
    throw new Error("Ongeldig antwoord van WooCommerce Store API");
  }
  const totalPages = Number(r.headers.get("x-wp-totalpages") || r.headers.get("X-WP-TotalPages") || "1");
  return { products, totalPages: Number.isFinite(totalPages) ? totalPages : 1 };
}

export async function fetchAllWcStoreProductsForCategory(
  categoryId: number,
  options?: { perPage?: number; delayMs?: number },
): Promise<{ products: WcStoreProduct[]; pagesFetched: number }> {
  const perPage = options?.perPage ?? 100;
  const delayMs = options?.delayMs ?? 100;
  const out: WcStoreProduct[] = [];
  let page = 1;
  let totalPages = 1;
  let pagesFetched = 0;

  for (;;) {
    const batch = await fetchWcStoreProductsPage(categoryId, page, perPage);
    totalPages = Math.max(1, batch.totalPages);
    pagesFetched += 1;
    out.push(...batch.products);
    if (batch.products.length === 0 || page >= totalPages) {
      break;
    }
    page += 1;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { products: out, pagesFetched };
}

/** Prijzen en SKU per variatie (variable product). */
export async function fetchWcStoreVariationsForParent(parentId: number): Promise<WcStoreProduct[]> {
  const url = `${wcStoreProductsEndpoint()}?type=variation&parent=${parentId}&per_page=100`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`WooCommerce Store API variations ${r.status}: ${text.slice(0, 200)}`);
  }
  const products = (await r.json()) as WcStoreProduct[];
  return Array.isArray(products) ? products : [];
}

export async function fetchWcStoreVariationsForParents(
  parentIds: number[],
  options?: { concurrency?: number; delayMs?: number },
): Promise<Map<number, WcStoreProduct[]>> {
  const concurrency = Math.max(1, Math.min(12, options?.concurrency ?? 8));
  const delayMs = options?.delayMs ?? 60;
  const map = new Map<number, WcStoreProduct[]>();
  const unique = [...new Set(parentIds)];
  for (let i = 0; i < unique.length; i += concurrency) {
    const slice = unique.slice(i, i + concurrency);
    const rows = await Promise.all(
      slice.map(async (id) => {
        try {
          const vars = await fetchWcStoreVariationsForParent(id);
          return [id, vars] as const;
        } catch {
          return [id, [] as WcStoreProduct[]] as const;
        }
      }),
    );
    for (const [id, vars] of rows) {
      map.set(id, vars);
    }
    if (delayMs > 0 && i + concurrency < unique.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return map;
}
