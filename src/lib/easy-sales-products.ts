import "server-only";

import {
  EasySalesApiError,
  easySalesRequest,
  getEasySalesConfig,
  type EasySalesConfig,
  type EasySalesSyncResult,
} from "@/lib/easy-sales";

export type EasySalesCatalogProduct = {
  id: number;
  sku?: string;
  stock?: number;
  reserved_stock?: number;
  product_website_id?: string;
  name?: string;
};

type EasySalesProductsResponse = {
  success?: boolean;
  data?: EasySalesCatalogProduct[];
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
};

export async function fetchEasySalesProductsPage(
  config: EasySalesConfig,
  page: number,
  perPage = 50,
): Promise<{ products: EasySalesCatalogProduct[]; lastPage: number; total: number }> {
  const q = new URLSearchParams({
    website_token: config.websiteToken,
    per_page: String(perPage),
    page: String(Math.max(1, page)),
  });
  const response = (await easySalesRequest(config, `/products?${q.toString()}`)) as EasySalesProductsResponse;
  const products = Array.isArray(response.data) ? response.data : [];
  const lastPage = response.meta?.last_page ?? 1;
  const total = response.meta?.total ?? products.length;
  return { products, lastPage, total };
}

export async function fetchAllEasySalesProducts(config: EasySalesConfig): Promise<EasySalesCatalogProduct[]> {
  const perPage = 50;
  const first = await fetchEasySalesProductsPage(config, 1, perPage);
  const all = [...first.products];
  for (let page = 2; page <= first.lastPage; page++) {
    const next = await fetchEasySalesProductsPage(config, page, perPage);
    all.push(...next.products);
  }
  return all;
}

export async function updateEasySalesProductStock(
  easySalesProductId: number,
  stock: number,
): Promise<EasySalesSyncResult> {
  const config = getEasySalesConfig();
  if (!config) {
    return { ok: false, error: "Easy-Sales is not configured." };
  }

  const body = {
    website_token: config.websiteToken,
    stock: Math.max(0, Math.floor(stock)),
  };

  try {
    const response = await easySalesRequest(
      config,
      `/products/${easySalesProductId}?website_token=${encodeURIComponent(config.websiteToken)}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
    );
    return { ok: true, response };
  } catch (e) {
    if (e instanceof EasySalesApiError) {
      const hint =
        e.status === 403
          ? " Token needs product update permission (update-products) in Easy-Sales API settings."
          : "";
      return { ok: false, error: `${e.message}${hint}`, status: e.status };
    }
    const message = e instanceof Error ? e.message : "Stock update failed";
    return { ok: false, error: message };
  }
}
