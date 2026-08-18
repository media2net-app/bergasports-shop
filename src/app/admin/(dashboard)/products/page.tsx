import Link from "next/link";

import AdminProductsInteractiveList, {
  type AdminProductListRow,
} from "@/components/admin/AdminProductsInteractiveList";
import AdminProductsListToolbar from "@/components/admin/AdminProductsListToolbar";
import {
  adminProductListQuery,
  buildAdminProductsQueryString,
  parseAdminProductStatusFilter,
  parseAdminProductStockFilter,
  uniqueAdminProductCategories,
  type AdminProductsQueryParams,
} from "@/lib/admin-products-list";
import { catalogSku, decodeImportedProductTitle, formatProductPrice } from "@/lib/products";
import { productAvailableStock, productStockState } from "@/lib/stock";
import { isWritableFilesystem, readTrendyolDatabase } from "@/lib/trendyol-json-store";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    page?: string;
    q?: string;
    category?: string;
    stock?: string;
    status?: string;
  }>;
};

const PAGE_SIZE = 50;

function formatListPrice(product: {
  priceDiscounted?: number;
  priceCurrent?: number;
  currency?: string;
}): string {
  const raw = product.priceDiscounted ?? product.priceCurrent;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return "—";
  }
  const currency = product.currency?.trim() || "EUR";
  if (currency === "Lei") {
    return `${raw.toFixed(2)} Lei`;
  }
  try {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(raw);
  } catch {
    return formatProductPrice(raw, "EUR");
  }
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const qInput = typeof sp.q === "string" ? sp.q : "";
  const qTrim = qInput.trim();
  const category = typeof sp.category === "string" ? sp.category.trim() : "";
  const stock = parseAdminProductStockFilter(sp.stock);
  const status = parseAdminProductStatusFilter(sp.status);
  const requestedPage = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);

  const db = await readTrendyolDatabase();
  const categories = uniqueAdminProductCategories(db.products);
  const queryBase: AdminProductsQueryParams = {
    filter: "all",
    q: qTrim,
    category,
    stock,
    status,
  };

  const { rows, total, totalPages, page, from, to } = adminProductListQuery(db.products, {
    filter: "all",
    q: qTrim,
    category,
    stock,
    status,
    page: requestedPage,
    pageSize: PAGE_SIZE,
  });

  const qs = (p: number) => buildAdminProductsQueryString({ ...queryBase, page: p });
  const pageLink = (p: number) => {
    const s2 = qs(p);
    return s2 ? `/admin/products?${s2}` : "/admin/products";
  };
  const exportQs = qs(page);
  const exportHref = exportQs ? `/api/admin/products/export?${exportQs}` : "/api/admin/products/export";

  const hasFilters = qTrim.length > 0 || category.length > 0 || stock !== "all" || status !== "all";
  const canWrite = isWritableFilesystem();

  const listRows: AdminProductListRow[] = rows.map((p) => {
    const thumbUrl = typeof p.image === "string" ? p.image.trim() : "";
    const available = productAvailableStock(p);
    return {
      id: p.id,
      displayName: decodeImportedProductTitle(p.name),
      sku: catalogSku(p) ?? "",
      category: p.category?.trim() ?? "",
      brand: p.brand?.trim() ?? "",
      priceLabel: formatListPrice(p),
      stockLabel: available == null ? "—" : String(available),
      stockState: productStockState(p),
      thumbUrl,
      featuredOnHomepage: Boolean(p.featuredOnHomepage),
      productStatus: p.productStatus === "concept" ? "concept" : "published",
    };
  });

  const emptyTitle = hasFilters ? "Geen resultaten" : "Nog geen producten";
  const emptyCopy = hasFilters
    ? qTrim
      ? `Niets gevonden voor “${qTrim}”.`
      : "Niets gevonden voor deze filters."
    : "Voeg je eerste product toe om de catalogus te vullen.";

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Producten</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            {total} {total === 1 ? "product" : "producten"}
            {hasFilters ? " in deze selectie" : ""}
            {qTrim ? ` voor “${qTrim}”` : ""}.
          </p>
        </div>
        <Link href="/admin/products/new" className="admin-btn-primary">
          Nieuw product
        </Link>
      </div>

      <AdminProductsListToolbar
        q={qInput}
        category={category}
        stock={stock}
        status={status}
        categories={categories}
        clearHref="/admin/products"
        hasFilters={hasFilters}
      />

      {rows.length === 0 ? (
        <div className="admin-panel admin-empty">
          <p className="admin-empty-title">{emptyTitle}</p>
          <p className="admin-muted admin-m-0">{emptyCopy}</p>
          {hasFilters ? (
            <Link href="/admin/products" className="admin-link-action admin-mt-1">
              Alle producten
            </Link>
          ) : (
            <Link href="/admin/products/new" className="admin-btn-primary admin-mt-1">
              Nieuw product
            </Link>
          )}
        </div>
      ) : (
        <AdminProductsInteractiveList
          rows={listRows}
          exportHref={exportHref}
          canWrite={canWrite}
        />
      )}

      {total > 0 ? (
        <div className="admin-pagination" role="navigation" aria-label="Paginering">
          <p className="admin-pagination-meta admin-m-0">
            <strong>{from}</strong>–<strong>{to}</strong> van <strong>{total}</strong>
          </p>
          {totalPages > 1 ? (
            <div className="admin-pagination-nav">
              {page <= 1 ? (
                <span className="admin-pagination-link is-disabled" aria-disabled="true">
                  Vorige
                </span>
              ) : (
                <Link href={pageLink(page - 1)} className="admin-pagination-link">
                  Vorige
                </Link>
              )}
              <span className="admin-pagination-pages">
                Pagina <strong>{page}</strong> / {totalPages}
              </span>
              {page >= totalPages ? (
                <span className="admin-pagination-link is-disabled" aria-disabled="true">
                  Volgende
                </span>
              ) : (
                <Link href={pageLink(page + 1)} className="admin-pagination-link">
                  Volgende
                </Link>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
