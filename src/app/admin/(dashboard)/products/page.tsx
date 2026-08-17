import Link from "next/link";

import AdminProductsInteractiveList, {
  type AdminProductListRow,
} from "@/components/admin/AdminProductsInteractiveList";
import {
  adminProductListQuery,
  buildAdminProductsQueryString,
} from "@/lib/admin-products-list";
import { decodeImportedProductTitle } from "@/lib/products";
import { isWritableFilesystem, readTrendyolDatabase } from "@/lib/trendyol-json-store";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ page?: string; q?: string }>;
};

const PAGE_SIZE = 50;

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const rawPage = sp.page;
  const qInput = typeof sp.q === "string" ? sp.q : "";
  const qTrim = qInput.trim();
  const requestedPage = Math.max(1, Number.parseInt(String(rawPage ?? "1"), 10) || 1);

  const db = await readTrendyolDatabase();
  const { rows, total, totalPages, page, from, to } = adminProductListQuery(db.products, {
    filter: "all",
    q: qInput,
    page: requestedPage,
    pageSize: PAGE_SIZE,
  });

  const qs = (p: number, q?: string) => buildAdminProductsQueryString("all", p, q);
  const pageLink = (p: number) => {
    const s2 = qs(p, qTrim);
    return s2 ? `/admin/products?${s2}` : "/admin/products";
  };
  const clearSearchHref = qs(1, undefined);
  const exportQs = qs(page, qTrim);
  const exportHref = exportQs ? `/api/admin/products/export?${exportQs}` : "/api/admin/products/export";

  const hasSearch = qTrim.length > 0;
  const canWrite = isWritableFilesystem();

  const listRows: AdminProductListRow[] = rows.map((p) => {
    const thumbUrl = typeof p.image === "string" ? p.image.trim() : "";
    return {
      id: p.id,
      catalogLabel: "Bergasports",
      displayName: decodeImportedProductTitle(p.name),
      category: p.category ?? "—",
      priceLabel:
        p.priceDiscounted != null
          ? `${p.priceDiscounted} ${p.currency ?? "EUR"}`
          : p.priceCurrent != null
            ? `${p.priceCurrent} ${p.currency ?? "EUR"}`
            : "—",
      stockLabel: "—",
      thumbUrl,
      featuredOnHomepage: Boolean(p.featuredOnHomepage),
      productStatus: p.productStatus === "concept" ? "concept" : "published",
    };
  });

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">Producten</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Beheer catalogus en prijzen. Wijzigingen gaan naar Prisma Postgres.
          </p>
        </div>
        <div className="admin-tools-row">
          <Link href="/admin/products/new" className="admin-btn-primary">
            Nieuw product
          </Link>
        </div>
      </div>

      <div className="admin-panel-surface admin-stack-tight">
        <form method="GET" action="/admin/products" className="admin-tools-row">
          <input
            className="admin-search-input"
            type="search"
            name="q"
            defaultValue={qInput}
            placeholder="Zoek op naam, ID, categorie of merk…"
            autoComplete="off"
            aria-label="Producten zoeken"
          />
          <button type="submit" className="admin-btn-primary">
            Zoeken
          </button>
          {hasSearch ? (
            <Link
              href={clearSearchHref ? `/admin/products?${clearSearchHref}` : "/admin/products"}
              className="admin-btn-secondary"
            >
              Wis zoekopdracht
            </Link>
          ) : null}
        </form>
        <div className="admin-stat-inline">
          <span>
            <strong>{total}</strong> {total === 1 ? "resultaat" : "resultaten"}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="admin-muted admin-m-0">Geen producten gevonden.</p>
      ) : (
        <AdminProductsInteractiveList rows={listRows} exportHref={exportHref} canWrite={canWrite} />
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
