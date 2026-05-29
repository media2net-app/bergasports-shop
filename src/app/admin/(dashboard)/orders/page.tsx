import Link from "next/link";

import {
  easySalesSyncBadgeClass,
  easySalesSyncLabel,
  type EasySalesSyncStatus,
} from "@/lib/easy-sales-sync-status";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";
import { countOrdersByStatus, listOrders } from "@/lib/orders-db";
import { getOrderSlaSummary } from "@/lib/order-sla";
import { formatProductPrice } from "@/lib/products";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ status?: string; page?: string; esync?: string }>;
};

type EasySalesSyncFilter = "all" | "failed" | "pending" | "synced";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function parseEsync(raw: string | undefined): EasySalesSyncFilter {
  if (raw === "failed" || raw === "pending" || raw === "synced") {
    return raw;
  }
  return "all";
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const rawStatus = sp.status;
  const status: OrderStatus | "all" =
    rawStatus && (rawStatus === "all" || ORDER_STATUSES.includes(rawStatus as OrderStatus))
      ? (rawStatus as OrderStatus | "all")
      : "all";
  const esync = parseEsync(sp.esync);
  const page = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);

  const [{ orders, total, totalPages, page: currentPage }, counts, sla] = await Promise.all([
    listOrders({ status, easySalesSync: esync, page, pageSize: 25 }),
    countOrdersByStatus(),
    getOrderSlaSummary(24),
  ]);

  const filterHref = (s: OrderStatus | "all", e: EasySalesSyncFilter, p = 1) => {
    const q = new URLSearchParams();
    if (s !== "all") {
      q.set("status", s);
    }
    if (e !== "all") {
      q.set("esync", e);
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
    if (esync !== "all") {
      q.set("esync", esync);
    }
    const qs = q.toString();
    return qs ? `/api/admin/orders/export?${qs}` : "/api/admin/orders/export";
  };

  return (
    <div className="admin-stack">
      {sla.pendingOlderThan24h > 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          <strong>SLA:</strong> {sla.pendingOlderThan24h} pending order
          {sla.pendingOlderThan24h === 1 ? "" : "s"} older than 24h.
          <Link href="/admin/orders?status=pending" className="ml-2 font-semibold underline">
            View pending
          </Link>
        </div>
      ) : null}
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Shop orders</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            {total} {total === 1 ? "order" : "orders"} from checkout; synced to Easy Sales after payment.
          </p>
        </div>
        <a href={exportHref()} className="admin-btn-secondary">
          Export CSV
        </a>
      </div>

      <div className="admin-pill-row">
        <span className="admin-pill-row-label">Status</span>
        <Link href={filterHref("all", esync)} className={`admin-pill${status === "all" ? " active" : ""}`}>
          All ({counts.all ?? 0})
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={filterHref(s, esync)} className={`admin-pill${status === s ? " active" : ""}`}>
            {ORDER_STATUS_LABEL[s]} ({counts[s] ?? 0})
          </Link>
        ))}
      </div>

      <div className="admin-pill-row">
        <span className="admin-pill-row-label">Easy Sales</span>
        <Link href={filterHref(status, "all")} className={`admin-pill${esync === "all" ? " active" : ""}`}>
          All
        </Link>
        <Link href={filterHref(status, "synced")} className={`admin-pill${esync === "synced" ? " active" : ""}`}>
          Synced
        </Link>
        <Link href={filterHref(status, "pending")} className={`admin-pill${esync === "pending" ? " active" : ""}`}>
          Pending
        </Link>
        <Link href={filterHref(status, "failed")} className={`admin-pill${esync === "failed" ? " active" : ""}`}>
          Failed
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="admin-panel">
          <p className="admin-muted admin-m-0">
            No orders yet
            {status !== "all" ? " with this status" : ""}
            {esync !== "all" ? " and this Easy Sales filter" : ""}. Place a test order on the shop.
          </p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Customer</th>
                <th>City</th>
                <th>Status</th>
                <th>Easy Sales</th>
                <th className="admin-td-right">Total</th>
                <th>Date</th>
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
                  <td>
                    <span
                      className={easySalesSyncBadgeClass(
                        (order.easy_sales_sync_status as EasySalesSyncStatus) ?? null,
                      )}
                    >
                      {easySalesSyncLabel((order.easy_sales_sync_status as EasySalesSyncStatus) ?? null)}
                    </span>
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
            <Link href={filterHref(status, esync, currentPage - 1)} className="admin-pagination-link">
              ← Previous
            </Link>
          ) : (
            <span className="admin-pagination-link is-disabled">← Previous</span>
          )}
          <span className="admin-pagination-meta">
            Page <strong>{currentPage}</strong> / {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link href={filterHref(status, esync, currentPage + 1)} className="admin-pagination-link">
              Next →
            </Link>
          ) : (
            <span className="admin-pagination-link is-disabled">Next →</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
