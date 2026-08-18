import { normalizeProductStatus } from "@/lib/product-status";
import { normalizeCatalogSource, type CatalogSource, type TrendyolJsonProduct } from "@/lib/products";
import { productStockState, type StockState } from "@/lib/stock";

export const ADMIN_PRODUCT_STOCK_FILTERS = ["all", "in_stock", "low_stock", "out_of_stock", "unmanaged"] as const;
export type AdminProductStockFilter = (typeof ADMIN_PRODUCT_STOCK_FILTERS)[number];

export const ADMIN_PRODUCT_STATUS_FILTERS = ["all", "published", "concept"] as const;
export type AdminProductStatusFilter = (typeof ADMIN_PRODUCT_STATUS_FILTERS)[number];

export type AdminProductListQueryInput = {
  filter: CatalogSource | "all";
  /** Ruwe zoekstring (wordt getrimd en lowercased). */
  q: string;
  page: number;
  pageSize: number;
  category?: string;
  stock?: AdminProductStockFilter;
  status?: AdminProductStatusFilter;
};

export type AdminProductListQueryResult = {
  rows: TrendyolJsonProduct[];
  total: number;
  totalPages: number;
  page: number;
  from: number;
  to: number;
};

export type AdminProductsQueryParams = {
  filter?: CatalogSource | "all";
  page?: number;
  q?: string;
  category?: string;
  stock?: AdminProductStockFilter;
  status?: AdminProductStatusFilter;
};

export function parseAdminProductStockFilter(value: string | undefined | null): AdminProductStockFilter {
  return ADMIN_PRODUCT_STOCK_FILTERS.includes(value as AdminProductStockFilter)
    ? (value as AdminProductStockFilter)
    : "all";
}

export function parseAdminProductStatusFilter(value: string | undefined | null): AdminProductStatusFilter {
  return ADMIN_PRODUCT_STATUS_FILTERS.includes(value as AdminProductStatusFilter)
    ? (value as AdminProductStatusFilter)
    : "all";
}

export function uniqueAdminProductCategories(products: TrendyolJsonProduct[]): string[] {
  const set = new Set<string>();
  for (const product of products) {
    const category = product.category?.trim();
    if (category) {
      set.add(category);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "nl"));
}

/**
 * Sorteert, filtert op catalogbron, categorie, voorraad, status en zoekterm, en pagineert
 * (zelfde logica als admin UI + export).
 */
export function adminProductListQuery(
  products: TrendyolJsonProduct[],
  input: AdminProductListQueryInput,
): AdminProductListQueryResult {
  const qLower = input.q.trim().toLowerCase();
  const pageSize = Math.max(1, Math.floor(input.pageSize));
  const category = input.category?.trim() ?? "";
  const stock = input.stock ?? "all";
  const status = input.status ?? "all";

  let list = [...products].sort((a, b) => b.id - a.id);

  if (input.filter !== "all") {
    list = list.filter((p) => normalizeCatalogSource(p.catalogSource) === input.filter);
  }

  if (category) {
    list = list.filter((p) => (p.category ?? "").trim() === category);
  }

  if (stock !== "all") {
    list = list.filter((p) => productStockState(p) === (stock as StockState));
  }

  if (status !== "all") {
    list = list.filter((p) => normalizeProductStatus(p.productStatus) === status);
  }

  if (qLower) {
    list = list.filter((p) => {
      const hay =
        `${p.id} ${p.name ?? ""} ${p.category ?? ""} ${p.brand ?? ""} ${p.wcSku ?? ""} ${p.easySalesSku ?? ""}`.toLowerCase();
      return hay.includes(qLower);
    });
  }

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, input.page), totalPages);
  const rows = list.slice((page - 1) * pageSize, page * pageSize);
  const from = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);

  return { rows, total, totalPages, page, from, to };
}

/** Querystring voor admin productlijst, export en paginatie (zelfde parameters). */
export function buildAdminProductsQueryString(input: AdminProductsQueryParams): string {
  const params = new URLSearchParams();
  if (input.filter && input.filter !== "all") {
    params.set("source", input.filter);
  }
  const qt = input.q?.trim();
  if (qt) {
    params.set("q", qt);
  }
  const category = input.category?.trim();
  if (category) {
    params.set("category", category);
  }
  if (input.stock && input.stock !== "all") {
    params.set("stock", input.stock);
  }
  if (input.status && input.status !== "all") {
    params.set("status", input.status);
  }
  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }
  return params.toString();
}
