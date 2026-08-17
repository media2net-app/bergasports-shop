import "server-only";

import { revalidatePath } from "next/cache";

import { requirePrisma } from "@/lib/database";
import type { OrderStatus } from "@/lib/orders";
import { productIdToBigInt } from "@/lib/prisma-mappers";
import {
  fetchWooCommerceOrders,
  isWooCommerceApiConfigured,
  type WooCommerceOrder,
} from "@/lib/woocommerce-api";

function mapWcStatus(status: string): OrderStatus {
  switch (status) {
    case "pending":
    case "checkout-draft":
      return "awaiting_payment";
    case "on-hold":
      return "pending";
    case "processing":
      return "processing";
    case "completed":
      return "delivered";
    case "cancelled":
    case "refunded":
    case "failed":
      return "cancelled";
    default:
      return "pending";
  }
}

function money(value: string | number | undefined): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function customerName(order: WooCommerceOrder): string {
  const b = order.billing || {};
  const s = order.shipping || {};
  const fromBilling = `${b.first_name || ""} ${b.last_name || ""}`.trim();
  if (fromBilling) return fromBilling;
  const fromShipping = `${s.first_name || ""} ${s.last_name || ""}`.trim();
  if (fromShipping) return fromShipping;
  return order.billing?.email?.trim() || `WC #${order.number}`;
}

function shippingAddress(order: WooCommerceOrder): string {
  const s = order.shipping?.address_1?.trim();
  const b = order.billing?.address_1?.trim();
  return s || b || "—";
}

function shippingCity(order: WooCommerceOrder): string {
  return order.shipping?.city?.trim() || order.billing?.city?.trim() || "—";
}

export function wooCommerceOrderNumber(order: WooCommerceOrder): string {
  return `WC-${order.number || order.id}`;
}

export async function upsertWooCommerceOrder(order: WooCommerceOrder): Promise<"created" | "updated"> {
  const prisma = requirePrisma();
  const orderNumber = wooCommerceOrderNumber(order);
  const total = money(order.total);
  const discountTotal = money(order.discount_total);
  const subtotal = Math.round((total + discountTotal) * 100) / 100;
  const currency = (order.currency || "EUR").toUpperCase();
  const status = mapWcStatus(order.status);
  const createdAt = new Date(order.date_created_gmt || order.date_created || Date.now());
  const phone =
    order.billing?.phone?.trim() ||
    order.billing?.email?.trim() ||
    "—";

  const existing = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true },
  });

  const itemCreates = (order.line_items || []).map((item) => {
    const lineTotal = money(item.total);
    const qty = Math.max(1, item.quantity || 1);
    const unitPrice =
      item.price != null && Number.isFinite(item.price)
        ? Math.round(Number(item.price) * 100) / 100
        : Math.round((lineTotal / qty) * 100) / 100;
    return {
      productId: item.product_id ? productIdToBigInt(item.product_id) : null,
      lineId: `wc-${item.id}`,
      name: item.name || `Product ${item.product_id}`,
      quantity: qty,
      unitPrice,
      lineTotal,
      currency,
      image: null,
      variationLabel: item.variation_id ? `var ${item.variation_id}` : null,
      bundleTierId: null,
    };
  });

  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: existing.id } });
      await tx.order.update({
        where: { id: existing.id },
        data: {
          status,
          customerName: customerName(order),
          customerEmail: order.billing?.email?.trim() || null,
          customerPhone: phone,
          shippingAddress: shippingAddress(order),
          shippingCity: shippingCity(order),
          shippingCounty: order.shipping?.state?.trim() || order.billing?.state?.trim() || null,
          shippingPostalCode:
            order.shipping?.postcode?.trim() || order.billing?.postcode?.trim() || null,
          notes: order.customer_note?.trim() || null,
          paymentMethod: order.payment_method_title || order.payment_method || "woocommerce",
          currency,
          subtotal,
          discountTotal,
          total,
          items: { create: itemCreates },
        },
      });
    });
    return "updated";
  }

  await prisma.order.create({
    data: {
      orderNumber,
      status,
      customerName: customerName(order),
      customerEmail: order.billing?.email?.trim() || null,
      customerPhone: phone,
      shippingAddress: shippingAddress(order),
      shippingCity: shippingCity(order),
      shippingCounty: order.shipping?.state?.trim() || order.billing?.state?.trim() || null,
      shippingPostalCode:
        order.shipping?.postcode?.trim() || order.billing?.postcode?.trim() || null,
      notes: order.customer_note?.trim() || null,
      paymentMethod: order.payment_method_title || order.payment_method || "woocommerce",
      currency,
      subtotal,
      discountTotal,
      total,
      marketingConsent: false,
      createdAt,
      items: { create: itemCreates },
    },
  });
  return "created";
}

export type WooCommerceOrdersSyncResult = {
  ok: true;
  fetched: number;
  created: number;
  updated: number;
  pages: number;
  totalRemote: number;
};

export async function syncWooCommerceOrders(options?: {
  maxPages?: number;
  /** ISO date — only orders modified after this */
  modifiedAfter?: string;
}): Promise<WooCommerceOrdersSyncResult> {
  if (!(await isWooCommerceApiConfigured())) {
    throw new Error("WooCommerce API keys ontbreken.");
  }

  let page = 1;
  let totalPages = 1;
  let totalRemote = 0;
  let fetched = 0;
  let created = 0;
  let updated = 0;
  const maxPages = options?.maxPages ?? 100;

  while (page <= totalPages && page <= maxPages) {
    const batch = await fetchWooCommerceOrders({
      page,
      perPage: 50,
      modifiedAfter: options?.modifiedAfter,
      order: "desc",
    });
    totalPages = batch.totalPages;
    totalRemote = batch.total;
    for (const order of batch.orders) {
      const result = await upsertWooCommerceOrder(order);
      fetched += 1;
      if (result === "created") created += 1;
      else updated += 1;
    }
    page += 1;
  }

  revalidatePath("/admin/orders");
  return { ok: true, fetched, created, updated, pages: page - 1, totalRemote };
}
