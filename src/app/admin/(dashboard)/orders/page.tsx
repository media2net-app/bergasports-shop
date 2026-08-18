import Link from "next/link";

import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  orderStatusTone,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
  type OrderStatus,
} from "@/lib/orders";
import { countOrdersByStatus, listOrders } from "@/lib/orders-db";
import { getOrderSlaSummary } from "@/lib/order-sla";
import { formatProductPrice } from "@/lib/products";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ status?: string; page?: string; q?: string }>;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { dateStyle: "short" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

function customerSecondary(order: { customer_email: string | null; customer_phone: string; shipping_city: string }) {
  const parts = [order.customer_email || order.customer_phone, order.shipping_city].filter((part) => part?.trim());
  return parts.join(" · ");
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

  const emptyTitle = search
    ? "Geen resultaten"
    : status !== "all"
      ? "Geen bestellingen met deze status"
      : "Nog geen bestellingen";
  const emptyCopy = search
    ? `Niets gevonden voor “${search}”.`
    : status !== "all"
      ? "Kies een andere filter of bekijk alle bestellingen."
      : "Shopbestellingen via Mollie verschijnen hier.";

  const visibleStatuses = ORDER_STATUSES.filter((s) => (counts[s] ?? 0) > 0 || status === s);

  return (
    <div className="admin-stack">
      {sla.pendingOlderThan24h > 0 ? (
        <div className="admin-banner warn" role="status">
          <strong>SLA:</strong> {sla.pendingOlderThan24h} open bestelling
          {sla.pendingOlderThan24h === 1 ? "" : "en"} ouder dan 24u.{" "}
          <Link href="/admin/orders?status=pending" className="admin-link-action">
            Bekijk open
          </Link>
        </div>
      ) : null}

      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Bestellingen</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            {total} {total === 1 ? "bestelling" : "bestellingen"}
            {search ? ` voor “${search}”` : ""}.
          </p>
        </div>
        <div className="admin-tools-row">
          <form className="admin-tools-row" action="/admin/orders" method="get">
            {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
            <input
              className="admin-search-input"
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Nummer, naam, e-mail…"
              aria-label="Bestellingen zoeken"
              autoComplete="off"
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

      <div className="admin-pill-row">
        <Link href={filterHref("all")} className={`admin-pill${status === "all" ? " active" : ""}`}>
          Alles
          <span className="admin-pill-count">{counts.all ?? 0}</span>
        </Link>
        {visibleStatuses.map((s) => (
          <Link key={s} href={filterHref(s)} className={`admin-pill${status === s ? " active" : ""}`}>
            {ORDER_STATUS_LABEL[s]}
            <span className="admin-pill-count">{counts[s] ?? 0}</span>
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="admin-panel admin-empty">
          <p className="admin-empty-title">{emptyTitle}</p>
          <p className="admin-muted admin-m-0">{emptyCopy}</p>
          {status !== "all" || search ? (
            <Link href="/admin/orders" className="admin-link-action admin-mt-1">
              Alle bestellingen
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="admin-panel admin-table-wrap admin-orders-table">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nummer</th>
                <th>Klant</th>
                <th>Verzending</th>
                <th>Betaling</th>
                <th className="admin-td-right">Totaal</th>
                <th>Datum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="admin-table-row-click">
                  <td className="admin-td-order">
                    <Link href={`/admin/orders/${order.id}`}>{order.order_number}</Link>
                  </td>
                  <td>
                    <div className="admin-table-customer">
                      <Link href={`/admin/orders/${order.id}`} className="admin-table-customer-name">
                        <span className="admin-td-truncate">{order.customer_name}</span>
                      </Link>
                      <span className="admin-muted">{customerSecondary(order) || "—"}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`admin-dash-status admin-dash-status--${orderStatusTone(order.status)}`}>
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </td>
                  <td>
                    <div className="admin-status-stack">
                      <span className={`admin-dash-status admin-dash-status--${paymentStatusTone(order.payment_status)}`}>
                        {paymentStatusLabel(order.payment_status)}
                      </span>
                      <span className="admin-muted">{paymentMethodLabel(order.payment_method)}</span>
                    </div>
                  </td>
                  <td className="admin-td-right admin-td-mono">
                    {formatProductPrice(order.total, order.currency)}
                  </td>
                  <td>
                    <div className="admin-table-date">
                      <span>{formatDate(order.created_at)}</span>
                      <span className="admin-muted">{formatTime(order.created_at)}</span>
                    </div>
                  </td>
                  <td className="admin-td-right">
                    <Link href={`/admin/orders/${order.id}`} className="admin-link-action">
                      Open
                    </Link>
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
