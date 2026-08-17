import Link from "next/link";

import AdminWooCommerceOrdersSyncButton from "@/components/admin/AdminWooCommerceOrdersSyncButton";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";
import { countOrdersByStatus, listOrders } from "@/lib/orders-db";
import { getOrderSlaSummary } from "@/lib/order-sla";
import { formatProductPrice } from "@/lib/products";
import { isWooCommerceApiConfigured } from "@/lib/woocommerce-api";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ status?: string; page?: string; q?: string }>;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const rawStatus = sp.status;
  const status: OrderStatus | "all" =
    rawStatus && (rawStatus === "all" || ORDER_STATUSES.includes(rawStatus as OrderStatus))
      ? (rawStatus as OrderStatus | "all")
      : "all";
  const page = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);
  const search = typeof sp.q === "string" ? sp.q.trim() : "";
  const wcConfigured = await isWooCommerceApiConfigured();

  const [{ orders, total, totalPages, page: currentPage }, counts, sla] = await Promise.all([
    listOrders({ status, page, pageSize: 25, q: search || undefined }),
    countOrdersByStatus(),
    getOrderSlaSummary(24),
  ]);

  const filterHref = (s: OrderStatus | "all", p = 1) => {
    const q = new URLSearchParams();
    if (s !== "all") {
      q.set("status", s);
    }
    if (search) {
      q.set("q", search);
    }
    if (p > 1) {
      q.set("page", String(p));
    }
    const qs = q.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  const exportHref = () => {
    const q = new URLSearchParams();
    if (status !== "all") {
      q.set("status", status);
    }
    const qs = q.toString();
    return qs ? `/api/admin/orders/export?${qs}` : "/api/admin/orders/export";
  };

  return (
    <div className="admin-stack">
      {sla.pendingOlderThan24h > 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          <strong>SLA:</strong> {sla.pendingOlderThan24h} open bestelling
          {sla.pendingOlderThan24h === 1 ? "" : "en"} ouder dan 24u.
          <Link href="/admin/orders?status=pending" className="ml-2 font-semibold underline">
            Bekijk open
          </Link>
        </div>
      ) : null}
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Bestellingen</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            {total} {total === 1 ? "bestelling" : "bestellingen"}
            {search ? ` · zoek: ${search}` : ""}
            {wcConfigured ? " · inclusief WooCommerce (WC-…)" : ""}.
          </p>
        </div>
        <div className="admin-tools-row">
          <form className="admin-tools-row" action="/admin/orders" method="get">
            {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
            <input
              className="admin-field admin-field--flush"
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Nummer, naam, e-mail, telefoon"
              aria-label="Bestellingen zoeken"
              style={{ minWidth: "16rem", marginBottom: 0 }}
            />
            <button type="submit" className="admin-btn-secondary">
              Zoeken
            </button>
            {search ? (
              <Link href={status === "all" ? "/admin/orders" : `/admin/orders?status=${status}`} className="admin-link-action">
                Wis
              </Link>
            ) : null}
          </form>
          <a href={exportHref()} className="admin-btn-secondary">
            Export CSV
          </a>
        </div>
      </div>

      {wcConfigured ? (
        <div className="admin-panel admin-stack-tight">
          <h2 className="admin-panel-title admin-m-0">WooCommerce sync</h2>
          <p className="admin-muted admin-m-0">
            Haal bestellingen op van bergasports.com. Orders krijgen nummer <code>WC-…</code>.
          </p>
          <AdminWooCommerceOrdersSyncButton />
        </div>
      ) : null}

      <div className="admin-pill-row">
        <span className="admin-pill-row-label">Status</span>
        <Link href={filterHref("all")} className={`admin-pill${status === "all" ? " active" : ""}`}>
          Alles ({counts.all ?? 0})
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={filterHref(s)} className={`admin-pill${status === s ? " active" : ""}`}>
            {ORDER_STATUS_LABEL[s]} ({counts[s] ?? 0})
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="admin-panel">
          <p className="admin-muted admin-m-0">
            Nog geen bestellingen
            {status !== "all" ? " met deze status" : ""}
            {wcConfigured ? ". Gebruik Sync WC hierboven." : "."}
          </p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nummer</th>
                <th>Klant</th>
                <th>Plaats</th>
                <th>Status</th>
                <th>Betaling</th>
                <th className="admin-td-right">Totaal</th>
                <th>Datum</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="admin-table-row-click">
                  <td className="admin-td-mono">
                    <Link href={`/admin/orders/${order.id}`}>{order.order_number}</Link>
                  </td>
                  <td>
                    <Link href={`/admin/orders/${order.id}`}>
                      <span className="admin-td-truncate">{order.customer_name}</span>
                    </Link>
                    <div className="admin-muted" style={{ fontSize: "0.75rem" }}>
                      {order.customer_phone}
                    </div>
                  </td>
                  <td>{order.shipping_city}</td>
                  <td>
                    <span className="admin-badge-src">{ORDER_STATUS_LABEL[order.status]}</span>
                  </td>
                  <td className="admin-muted" style={{ fontSize: "0.8rem" }}>
                    {order.payment_method}
                  </td>
                  <td className="admin-td-right admin-td-mono">
                    {formatProductPrice(order.total, order.currency)}
                  </td>
                  <td className="admin-muted" style={{ fontSize: "0.75rem" }}>
                    {formatDate(order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="admin-pagination">
          {currentPage > 1 ? (
            <Link href={filterHref(status, currentPage - 1)} className="admin-pagination-link">
              ← Vorige
            </Link>
          ) : (
            <span className="admin-pagination-link is-disabled">← Vorige</span>
          )}
          <span className="admin-pagination-meta">
            Pagina <strong>{currentPage}</strong> / {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link href={filterHref(status, currentPage + 1)} className="admin-pagination-link">
              Volgende →
            </Link>
          ) : (
            <span className="admin-pagination-link is-disabled">Volgende →</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
