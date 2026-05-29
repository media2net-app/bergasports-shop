import Link from "next/link";
import { notFound } from "next/navigation";

import AdminOrderEasySalesSync from "@/components/admin/AdminOrderEasySalesSync";
import AdminOrderStatusSelect from "@/components/admin/AdminOrderStatusSelect";
import type { EasySalesSyncStatus } from "@/lib/easy-sales-sync-status";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { getOrderById } from "@/lib/orders-db";
import { formatProductPrice } from "@/lib/products";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id)) {
    notFound();
  }

  const order = await getOrderById(id);
  if (!order) {
    notFound();
  }

  const addressLines = [
    order.shipping_address,
    [order.shipping_postal_code, order.shipping_city].filter(Boolean).join(" "),
    order.shipping_county,
  ].filter(Boolean);

  return (
    <div className="admin-stack">
      <Link href="/admin/orders" className="admin-breadcrumb">
        ← Back to orders
      </Link>

      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">{order.order_number}</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Placed {formatDate(order.created_at)} · {ORDER_STATUS_LABEL[order.status]}
          </p>
        </div>
      </div>

      <div
        className="admin-stack admin-stack-tight"
        style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        <div className="admin-panel admin-stack-tight">
          <h2 className="admin-h2 admin-m-0">Customer &amp; shipping</h2>
          <p className="admin-m-0">
            <strong>{order.customer_name}</strong>
          </p>
          <p className="admin-muted admin-m-0">{order.customer_phone}</p>
          {order.customer_email ? <p className="admin-muted admin-m-0">{order.customer_email}</p> : null}
          <div className="admin-mt-1">
            {addressLines.map((line) => (
              <p key={line} className="admin-m-0">
                {line}
              </p>
            ))}
          </div>
          {order.notes ? (
            <div className="admin-mt-1">
              <p className="admin-label admin-m-0">Customer notes</p>
              <p className="admin-m-0">{order.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="admin-panel admin-stack-tight">
          <h2 className="admin-h2 admin-m-0">Easy-Sales</h2>
          <AdminOrderEasySalesSync
            orderId={order.id}
            status={(order.easy_sales_sync_status as EasySalesSyncStatus) ?? null}
            error={order.easy_sales_sync_error}
            syncedAt={order.easy_sales_synced_at}
          />
        </div>

        <div className="admin-panel admin-stack-tight">
          <AdminOrderStatusSelect orderId={order.id} currentStatus={order.status} />
          <div className="admin-stat-inline admin-mt-1">
            <span>
              Subtotal: <strong>{formatProductPrice(order.subtotal, order.currency)}</strong>
            </span>
            {order.discount_total > 0.005 ? (
              <span>
                Discount: <strong>-{formatProductPrice(order.discount_total, order.currency)}</strong>
              </span>
            ) : null}
            <span>
              Total: <strong>{formatProductPrice(order.total, order.currency)}</strong>
            </span>
          </div>
          <p className="admin-muted admin-m-0" style={{ fontSize: "0.85rem" }}>
            Payment:{" "}
            {order.payment_method === "cash_on_delivery" ? "Cash on delivery" : order.payment_method}
          </p>
        </div>
      </div>

      <div className="admin-panel admin-stack-tight">
        <h2 className="admin-h2 admin-m-0">Line items ({order.items.length})</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="admin-td-right">Qty</th>
                <th className="admin-td-right">Unit price</th>
                <th className="admin-td-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <p className="admin-m-0">{item.name}</p>
                    {item.variation_label ? (
                      <p className="admin-muted admin-m-0" style={{ fontSize: "0.8rem" }}>
                        {item.variation_label}
                      </p>
                    ) : null}
                    {item.product_id ? (
                      <Link href={`/admin/products/${item.product_id}`} style={{ fontSize: "0.8rem" }}>
                        Product #{item.product_id}
                      </Link>
                    ) : null}
                  </td>
                  <td className="admin-td-right">{item.quantity}</td>
                  <td className="admin-td-right admin-td-mono">
                    {formatProductPrice(item.unit_price, item.currency)}
                  </td>
                  <td className="admin-td-right admin-td-mono">
                    {formatProductPrice(item.line_total, item.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
