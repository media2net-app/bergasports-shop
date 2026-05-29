import "server-only";

import type { OrderStatus, OrderWithItems } from "@/lib/orders";
import { sendOutboundEmail } from "@/lib/outbound-email";
import { buildOrderStatusEmailParts, type OrderStatusEmailKind } from "@/lib/transactional-order-emails";

export type { OrderStatusEmailKind };

export type OrderStatusEmailsSent = Partial<Record<OrderStatusEmailKind, string>>;

export function statusToEmailKind(
  status: OrderStatus,
  previousStatus: OrderStatus | null,
): OrderStatusEmailKind | null {
  if (status === "cancelled") {
    return "cancelled";
  }
  if (status === "shipped") {
    return "shipped";
  }
  if (status === "delivered") {
    return "delivered";
  }
  if (status === "confirmed" && previousStatus !== "confirmed") {
    return "confirmed";
  }
  return null;
}

export function parseStatusEmailsSent(value: unknown): OrderStatusEmailsSent {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: OrderStatusEmailsSent = {};
  for (const key of ["received", "confirmed", "shipped", "delivered", "cancelled"] as const) {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === "string" && v) {
      out[key] = v;
    }
  }
  return out;
}

export async function sendOrderStatusEmailToCustomer(
  order: OrderWithItems,
  kind: OrderStatusEmailKind,
): Promise<boolean> {
  const email = order.customer_email?.trim();
  if (!email) {
    return false;
  }

  const { subject, text, html } = buildOrderStatusEmailParts(kind, order);
  return sendOutboundEmail({ to: email, subject, text, html });
}
