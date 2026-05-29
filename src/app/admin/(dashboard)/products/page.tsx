import Link from "next/link";

import AdminProductsInteractiveList, {
  type AdminProductListRow,
} from "@/components/admin/AdminProductsInteractiveList";
import EasySalesStockSyncButton from "@/components/admin/EasySalesStockSyncButton";
import { hasStockQuantity, productAvailableStock } from "@/lib/stock";
import {
  adminProductListQuery,
  buildAdminProductsQueryString,
} from "@/lib/admin-products-list";
import {
  CATALOG_SOURCES,
  decodeImportedProductTitle,
  normalizeCatalogSource,
  type CatalogSource,
} from "@/lib/products";
import { countProductsWithSyncedStock } from "@/lib/easy-sales-stock-sync";
import { isWritableFilesystem, readTrendyolDatabase } from "@/lib/trendyol-json-store";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<CatalogSource, string> = {
  trendyol: "Trendyol",
  ralex: "Ralex",
  manual: "Manual",
};

type PageProps = {
  searchParams?: Promise<{ source?: string; page?: string; q?: string }>;
};

const PAGE_SIZE = 50;

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const rawFilter = sp.source;
  const rawPage = sp.page;
  const qInput = typeof sp.q === "string" ? sp.q : "";
  const qTrim = qInput.trim();

  const filter: CatalogSource | "all" =
    rawFilter && CATALOG_SOURCES.includes(rawFilter as CatalogSource) ? (rawFilter as CatalogSource) : "all";

  const requestedPage = Math.max(1, Number.parseInt(String(rawPage ?? "1"), 10) || 1);

  const db = await readTrendyolDatabase();
  const syncedStockCount = await countProductsWithSyncedStock();
  const { rows, total, totalPages, page, from, to } = adminProductListQuery(db.products, {
    filter,
    q: qInput,
    page: requestedPage,
    pageSize: PAGE_SIZE,
  });

  const qs = (f: CatalogSource | "all", p: number, q?: string) => buildAdminProductsQueryString(f, p, q);
  const filterLink = (s: CatalogSource | "all") => {
    const s2 = qs(s, 1, qTrim);
    return s2 ? `/admin/products?${s2}` : "/admin/products";
  };
  const pageLink = (p: number) => {
    const s2 = qs(filter, p, qTrim);
    return s2 ? `/admin/products?${s2}` : "/admin/products";
  };
  const clearSearchHref = qs(filter, 1, undefined);
  const exportQs = qs(filter, page, qTrim);
  const exportHref = exportQs ? `/api/admin/products/export?${exportQs}` : "/api/admin/products/export";

  const counts = CATALOG_SOURCES.reduce(
    (acc, s) => {
      acc[s] = db.products.filter((p) => normalizeCatalogSource(p.catalogSource) === s).length;
      return acc;
    },
    {} as Record<CatalogSource, number>,
  );

  const hasSearch = qTrim.length > 0;
  const canWrite = isWritableFilesystem();

  const listRows: AdminProductListRow[] = rows.map((p) => {
    const src = normalizeCatalogSource(p.catalogSource);
    const thumbUrl = typeof p.image === "string" ? p.image.trim() : "";
    const available = productAvailableStock(p);
    const stockLabel = hasStockQuantity(p)
      ? available != null
        ? String(available)
        : "—"
      : "Not linked";

    return {
      id: p.id,
      catalogLabel: SOURCE_LABEL[src],
      displayName: decodeImportedProductTitle(p.name),
      category: p.category ?? "—",
      priceLabel: p.priceDiscounted != null ? `${p.priceDiscounted} ${p.currency ?? "Lei"}` : "—",
      stockLabel,
      thumbUrl,
      featuredOnHomepage: Boolean(p.featuredOnHomepage),
      productStatus: p.productStatus === "concept" ? "concept" : "published",
    };
  });

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">Products</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Manage catalog, prices, and metadata. Changes go to <strong>Prisma Postgres</strong>. The list is always paginated (
            {PAGE_SIZE} per page), including “All” and search.
            {syncedStockCount > 0 ? (
              <>
                {" "}
                Stock synced for <strong>{syncedStockCount}</strong> product(s) from Easy Sales.
              </>
            ) : (
              <>
                {" "}
                Stock not synced yet — click <strong>Sync stock from Easy Sales</strong> (matches by SKU or product name).
              </>
            )}
          </p>
        </div>
        <div className="admin-tools-row">
          <EasySalesStockSyncButton disabled={!canWrite} />
          <Link href="/admin/products/new" className="admin-btn-primary">
            New product
          </Link>
        </div>
      </div>

      <div className="admin-panel-surface admin-stack-tight">
        <form method="GET" action="/admin/products" className="admin-tools-row">
          {filter !== "all" ? <input type="hidden" name="source" value={filter} /> : null}
          <input
            className="admin-search-input"
            type="search"
            name="q"
            defaultValue={qInput}
            placeholder="Search by name, ID, category, or brand…"
            autoComplete="off"
            aria-label="Search products"
          />
          <button type="submit" className="admin-btn-primary">
            Search
          </button>
          {hasSearch ? (
            <Link href={clearSearchHref ? `/admin/products?${clearSearchHref}` : "/admin/products"} className="admin-btn-secondary">
              Clear search
            </Link>
          ) : null}
        </form>
        <div className="admin-stat-inline">
          <span>
            <strong>{total}</strong> {total === 1 ? "result" : "results"}
          </span>
          {filter !== "all" ? (
            <span>
              source: <strong>{SOURCE_LABEL[filter]}</strong>
            </span>
          ) : (
            <span>all sources</span>
          )}
          {hasSearch ? <span>with search filter</span> : null}
        </div>
      </div>

      <div className="admin-pill-row">
        <span className="admin-pill-row-label">Catalog</span>
        {(["all", ...CATALOG_SOURCES] as const).map((s) => {
          const active = filter === s;
          const label = s === "all" ? `All (${db.products.length})` : `${SOURCE_LABEL[s]} (${counts[s]})`;
          return (
            <Link key={s} href={filterLink(s)} className={`admin-pill${active ? " active" : ""}`}>
              {label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="admin-muted admin-m-0">
          No products found. Adjust filters or search, or add a product.
        </p>
      ) : (
        <AdminProductsInteractiveList rows={listRows} exportHref={exportHref} canWrite={canWrite} />
      )}

      {total > 0 ? (
        <div className="admin-pagination" role="navigation" aria-label="Pagination">
          <p className="admin-pagination-meta admin-m-0">
            Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong> ({PAGE_SIZE} per page)
          </p>
          {totalPages > 1 ? (
            <div className="admin-pagination-nav">
              {page <= 1 ? (
                <span className="admin-pagination-link is-disabled" aria-disabled="true">
                  Previous
                </span>
              ) : (
                <Link href={pageLink(page - 1)} className="admin-pagination-link">
                  Previous
                </Link>
              )}
              <span className="admin-pagination-pages">
                Page <strong>{page}</strong> / {totalPages}
              </span>
              {page >= totalPages ? (
                <span className="admin-pagination-link is-disabled" aria-disabled="true">
                  Next
                </span>
              ) : (
                <Link href={pageLink(page + 1)} className="admin-pagination-link">
                  Next
                </Link>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
