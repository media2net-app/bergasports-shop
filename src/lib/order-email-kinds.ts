import type { OrderStatus } from "@/lib/orders";

export type OrderStatusEmailKind = "received" | "confirmed" | "shipped" | "delivered" | "cancelled";

export const ORDER_STATUS_EMAIL_KINDS: OrderStatusEmailKind[] = [
  "received",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

export const ORDER_STATUS_EMAIL_KIND_LABEL: Record<OrderStatusEmailKind, string> = {
  received: "Bestelling ontvangen",
  confirmed: "Bestelling bevestigd",
  shipped: "Bestelling verzonden",
  delivered: "Bestelling geleverd",
  cancelled: "Bestelling geannuleerd",
};

export function emailKindForFulfillmentStatus(status: OrderStatus): OrderStatusEmailKind {
  switch (status) {
    case "cancelled":
      return "cancelled";
    case "shipped":
      return "shipped";
    case "delivered":
      return "delivered";
    case "confirmed":
    case "processing":
    case "ready_for_pickup":
      return "confirmed";
    default:
      return "received";
  }
}
