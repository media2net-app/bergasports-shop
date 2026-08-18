import Link from "next/link";

import AdminOrderFulfillment from "@/components/admin/AdminOrderFulfillment";
import AdminOrderHeaderStatuses from "@/components/admin/AdminOrderHeaderStatuses";
import AdminOrderLineItems from "@/components/admin/AdminOrderLineItems";
import type { OrderLineCatalogInfo } from "@/lib/admin-product-search-types";
import {
  orderShippingTotal,
  type OrderBillingAddress,
  type OrderWithItems,
} from "@/lib/orders";
import { catalogSku } from "@/lib/products";
import { getProductsRawByIds } from "@/lib/products-db";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminOrderDetail({
  order,
  shippingLabel,
  couponCode,
  customerNote,
  internalNote,
  billing,
  customerId,
  pickupLocation,
}: {
  order: OrderWithItems;
  shippingLabel: string | null;
  couponCode: string | null;
  customerNote: string | null;
  internalNote: string | null;
  billing: OrderBillingAddress | null;
  customerId: string | null;
  pickupLocation: string;
}) {
  const shippingTotal = orderShippingTotal(order);
  const productIds = [
    ...new Set(order.items.map((item) => item.product_id).filter((id): id is number => id != null)),
  ];
  const catalogRows = await getProductsRawByIds(productIds);
  const catalogById: Record<number, OrderLineCatalogInfo> = {};
  for (const product of catalogRows) {
    catalogById[product.id] = {
      sku: catalogSku(product),
      image: product.image?.trim() || null,
    };
  }

  return (
    <div className="admin-order">
      <Link href="/admin/orders" className="admin-breadcrumb">
        ← Bestellingen
      </Link>

      <header className="admin-order-head">
        <div>
          <p className="admin-order-kicker">Bestelling</p>
          <h1 className="admin-order-number">{order.order_number}</h1>
          <time className="admin-order-when" dateTime={order.created_at}>
            {formatWhen(order.created_at)}
          </time>
        </div>
        <AdminOrderHeaderStatuses
          key={`status-${order.updated_at}`}
          orderId={order.id}
          paymentStatus={order.payment_status}
          fulfillmentStatus={order.status}
        />
      </header>

      <div className="admin-order-layout">
        <AdminOrderLineItems
          key={`lines-${order.updated_at}`}
          orderId={order.id}
          currency={order.currency}
          items={order.items}
          catalogById={catalogById}
          discountTotal={order.discount_total}
          shippingTotal={shippingTotal}
          shippingLabel={shippingLabel}
          couponCode={couponCode}
        />
        <AdminOrderFulfillment
          key={`fulfill-${order.updated_at}`}
          order={order}
          shippingLabel={shippingLabel}
          customerNote={customerNote}
          internalNote={internalNote}
          billing={billing}
          customerId={customerId}
          pickupLocation={pickupLocation}
        />
      </div>
    </div>
  );
}
