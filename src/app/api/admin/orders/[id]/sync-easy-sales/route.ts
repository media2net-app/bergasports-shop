import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { pushOrderToEasySalesAfterCreate } from "@/lib/easy-sales-sync";
import { getOrderById } from "@/lib/orders-db";

export const dynamic = "force-dynamic";

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await guard();
  if (denied) {
    return denied;
  }

  const id = Number.parseInt((await context.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await pushOrderToEasySalesAfterCreate(order.id, {
    customerName: order.customer_name,
    customerEmail: order.customer_email ?? undefined,
    customerPhone: order.customer_phone,
    shippingAddress: order.shipping_address,
    shippingCity: order.shipping_city,
    shippingCounty: order.shipping_county ?? undefined,
    shippingPostalCode: order.shipping_postal_code ?? undefined,
    notes: order.notes ?? undefined,
    paymentMethod: order.payment_method,
    currency: order.currency,
    subtotal: order.subtotal,
    discountTotal: order.discount_total,
    total: order.total,
    items: order.items.map((item) => ({
      productId: item.product_id ?? 0,
      lineId: item.line_id ?? String(item.id),
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
      currency: item.currency,
      image: item.image ?? undefined,
      variationLabel: item.variation_label ?? undefined,
      bundleTierId: item.bundle_tier_id ?? undefined,
    })),
    orderNumber: order.order_number,
    createdAt: order.created_at,
  });

  const updated = await getOrderById(id);
  return NextResponse.json({
    ok: updated?.easy_sales_sync_status === "synced",
    status: updated?.easy_sales_sync_status ?? null,
    error: updated?.easy_sales_sync_error ?? null,
    syncedAt: updated?.easy_sales_synced_at ?? null,
  });
}
