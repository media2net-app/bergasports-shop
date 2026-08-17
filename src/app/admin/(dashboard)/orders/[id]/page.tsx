import Link from "next/link";
import { notFound } from "next/navigation";

import AdminOrderFulfillment from "@/components/admin/AdminOrderFulfillment";
import AdminOrderStatusSelect from "@/components/admin/AdminOrderStatusSelect";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { getOrderById } from "@/lib/orders-db";
import { formatProductPrice } from "@/lib/products";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", {
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

  return (
    <div className="admin-stack">
      <Link href="/admin/orders" className="admin-breadcrumb">
        ← Terug naar bestellingen
      </Link>

      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">{order.order_number}</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Geplaatst {formatDate(order.created_at)} · {ORDER_STATUS_LABEL[order.status]}
          </p>
        </div>
      </div>

      <div
        className="admin-stack admin-stack-tight"
        style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        <div className="admin-panel admin-stack-tight">
          <h2 className="admin-h2 admin-m-0">Klant</h2>
          <p className="admin-m-0">
            <strong>{order.customer_name}</strong>
          </p>
          {order.customer_phone ? (
            <p className="admin-muted admin-m-0">
              <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a>
            </p>
          ) : null}
          {order.customer_email ? (
            <p className="admin-muted admin-m-0">
              <a href={`mailto:${order.customer_email}`}>{order.customer_email}</a>
            </p>
          ) : null}
          <p className="admin-muted admin-m-0 admin-mt-1 admin-text-sm">
            Adres, naam en opmerkingen bewerk je hieronder bij verzending.
          </p>
        </div>

        <div className="admin-panel admin-stack-tight">
          <AdminOrderStatusSelect orderId={order.id} currentStatus={order.status} />
          <div className="admin-stat-inline admin-mt-1">
            <span>
              Subtotaal: <strong>{formatProductPrice(order.subtotal, order.currency)}</strong>
            </span>
            {order.discount_total > 0.005 ? (
              <span>
                Korting: <strong>-{formatProductPrice(order.discount_total, order.currency)}</strong>
              </span>
            ) : null}
            <span>
              Totaal: <strong>{formatProductPrice(order.total, order.currency)}</strong>
            </span>
          </div>
          <p className="admin-muted admin-m-0" style={{ fontSize: "0.85rem" }}>
            Betaling:{" "}
            {order.payment_method === "cash_on_delivery"
              ? "Rembours"
              : order.payment_method === "mollie"
                ? "Online (Mollie)"
                : order.payment_method}
            {order.payment_status ? ` · ${order.payment_status}` : ""}
            {order.tracking_code ? ` · tracking ${order.tracking_code}` : ""}
          </p>
        </div>
      </div>

      <AdminOrderFulfillment order={order} />

      <div className="admin-panel admin-stack-tight">
        <h2 className="admin-h2 admin-m-0">Regels ({order.items.length})</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="admin-td-right">Aantal</th>
                <th className="admin-td-right">Prijs</th>
                <th className="admin-td-right">Regel</th>
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
