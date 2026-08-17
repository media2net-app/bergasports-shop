import { notFound } from "next/navigation";

import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { getOrderById } from "@/lib/orders-db";
import { formatProductPrice } from "@/lib/products";
import { SITE_BRAND_NAME, SITE_EMAIL } from "@/lib/site-brand";
import { SHOP_PHONE_LABEL, SITE_ADDRESS } from "@/lib/site-contact";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderInvoicePage({ params }: Props) {
  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id)) notFound();
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <div className="admin-cc" style={{ background: "#fff", minHeight: "100vh", padding: "2rem" }}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <p className="no-print admin-muted">Gebruik Afdrukken in je browser (Cmd/Ctrl+P) om als PDF op te slaan.</p>
      <p style={{ letterSpacing: "0.12em", fontSize: "0.75rem", fontWeight: 700 }}>FACTUUR</p>
      <h1 style={{ margin: "0.35rem 0 1rem" }}>
        {SITE_BRAND_NAME} · {order.order_number}
      </h1>
      <p>
        {SITE_ADDRESS}
        <br />
        {SITE_EMAIL} · {SHOP_PHONE_LABEL}
      </p>
      <p>
        <strong>Klant</strong>
        <br />
        {order.customer_name}
        <br />
        {order.shipping_address}
        <br />
        {[order.shipping_postal_code, order.shipping_city].filter(Boolean).join(" ")}
        <br />
        {order.customer_email}
      </p>
      <p>
        Datum: {new Date(order.created_at).toLocaleDateString("nl-NL")} · Status:{" "}
        {ORDER_STATUS_LABEL[order.status]}
        {order.refunded_at ? " · TERUGBETAALD" : ""}
      </p>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Aantal</th>
            <th>Prijs</th>
            <th>Totaal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>
                {item.name}
                {item.variation_label ? ` (${item.variation_label})` : ""}
              </td>
              <td>{item.quantity}</td>
              <td>{formatProductPrice(item.unit_price, item.currency)}</td>
              <td>{formatProductPrice(item.line_total, item.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Subtotaal: {formatProductPrice(order.subtotal, order.currency)}
        <br />
        {order.discount_total > 0 ? (
          <>
            Korting: -{formatProductPrice(order.discount_total, order.currency)}
            <br />
          </>
        ) : null}
        <strong>Totaal: {formatProductPrice(order.total, order.currency)}</strong>
      </p>
    </div>
  );
}
