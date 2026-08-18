import { normalizeCatalogSource, type CatalogSource, type TrendyolJsonProduct } from "@/lib/products";

export type AdminProductListQueryInput = {
  filter: CatalogSource | "all";
  /** Ruwe zoekstring (wordt getrimd en lowercased). */
  q: string;
  page: number;
  pageSize: number;
};

export type AdminProductListQueryResult = {
  rows: TrendyolJsonProduct[];
  total: number;
  totalPages: number;
  page: number;
  from: number;
  to: number;
};

/**
 * Sorteert, filtert op catalogbron en zoekterm, en pagineert (zelfde logica als admin UI + export).
 */
export function adminProductListQuery(
  products: TrendyolJsonProduct[],
  input: AdminProductListQueryInput,
): AdminProductListQueryResult {
  const qLower = input.q.trim().toLowerCase();
  const pageSize = Math.max(1, Math.floor(input.pageSize));

  let list = [...products].sort((a, b) => b.id - a.id);

  if (input.filter !== "all") {
    list = list.filter((p) => normalizeCatalogSource(p.catalogSource) === input.filter);
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
export function buildAdminProductsQueryString(
  filter: CatalogSource | "all",
  page: number,
  q: string | undefined,
): string {
  const params = new URLSearchParams();
  if (filter !== "all") {
    params.set("source", filter);
  }
  const qt = q?.trim();
  if (qt) {
    params.set("q", qt);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  return params.toString();
}
