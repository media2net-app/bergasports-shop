import { mollieMethodLabel } from "@/lib/mollie-methods";

export const ORDER_STATUSES = [
  "awaiting_payment",
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Wacht op betaling",
  pending: "Open",
  confirmed: "Bevestigd",
  processing: "In behandeling",
  shipped: "Verzonden",
  delivered: "Afgeleverd",
  cancelled: "Geannuleerd",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  pending: "In behandeling",
  authorized: "Geautoriseerd",
  paid: "Betaald",
  canceled: "Geannuleerd",
  cancelled: "Geannuleerd",
  expired: "Verlopen",
  failed: "Mislukt",
  refunded: "Terugbetaald",
  partially_refunded: "Deels terugbetaald",
};

export function paymentStatusLabel(status: string | null | undefined): string {
  if (!status?.trim()) return "Onbekend";
  return PAYMENT_STATUS_LABEL[status] ?? status;
}

export function paymentMethodLabel(method: string): string {
  if (method === "cash_on_delivery") return "Rembours";
  if (method === "mollie") return "Online (Mollie)";
  if (method.startsWith("mollie:")) return mollieMethodLabel(method.slice("mollie:".length));
  return mollieMethodLabel(method);
}

export function orderStatusTone(status: OrderStatus): string {
  switch (status) {
    case "awaiting_payment":
      return "wait";
    case "pending":
      return "warn";
    case "confirmed":
    case "processing":
      return "brand";
    case "shipped":
    case "delivered":
      return "ok";
    case "cancelled":
      return "mute";
    default:
      return "mute";
  }
}

export function paymentStatusTone(status: string | null | undefined): string {
  switch ((status ?? "").toLowerCase()) {
    case "paid":
    case "authorized":
      return "ok";
    case "open":
    case "pending":
      return "wait";
    case "failed":
    case "expired":
    case "canceled":
    case "cancelled":
      return "err";
    case "refunded":
    case "partially_refunded":
      return "warn";
    default:
      return "mute";
  }
}

export function parseOrderCheckoutNotes(notes: string | null | undefined): {
  shippingLabel: string | null;
  couponCode: string | null;
  customerNote: string | null;
} {
  const lines = (notes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const shippingLine = lines.find((line) => /^Verzending:/i.test(line));
  const couponLine = lines.find((line) => /^Coupon:/i.test(line));
  const customerNote = lines
    .filter((line) => !/^Verzending:/i.test(line) && !/^Coupon:/i.test(line))
    .join("\n")
    .trim();
  return {
    shippingLabel: shippingLine?.replace(/^Verzending:\s*/i, "").trim() || null,
    couponCode: couponLine?.replace(/^Coupon:\s*/i, "").trim() || null,
    customerNote: customerNote || null,
  };
}

export function orderShippingTotal(order: Pick<OrderRow, "subtotal" | "discount_total" | "total">): number {
  const value = Math.round((order.total - order.subtotal + order.discount_total) * 100) / 100;
  return value > 0.004 ? value : 0;
}

export type OrderItemInput = {
  productId: number;
  lineId: string;
  /** WooCommerce / Easy Sales SKU when known */
  sku?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  currency: string;
  image?: string;
  variationLabel?: string;
  bundleTierId?: string;
};

export type CreateOrderInput = {
  customerName: string;
  customerEmail?: string;
  /** Checkout opt-in for offers / lifecycle emails */
  marketingConsent?: boolean;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingCounty?: string;
  shippingPostalCode?: string;
  notes?: string;
  paymentMethod?: string;
  currency: string;
  subtotal: number;
  discountTotal: number;
  total: number;
  items: OrderItemInput[];
};

export type OrderRow = {
  id: number;
  order_number: string;
  status: OrderStatus;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_county: string | null;
  shipping_postal_code: string | null;
  notes: string | null;
  payment_method: string;
  mollie_payment_id: string | null;
  currency: string;
  subtotal: number;
  discount_total: number;
  total: number;
  created_at: string;
  updated_at: string;
  easy_sales_sync_status: string | null;
  easy_sales_sync_error: string | null;
  easy_sales_synced_at: string | null;
  status_emails_sent: Record<string, string> | null;
  marketing_consent: boolean;
  tracking_code: string | null;
  tracking_url: string | null;
  shipping_carrier: string | null;
  sendcloud_parcel_id: number | null;
  sendcloud_label_url: string | null;
  refunded_at: string | null;
  refund_amount: number | null;
  payment_status: string | null;
};

export type OrderItemRow = {
  id: number;
  order_id: number;
  product_id: number | null;
  line_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  currency: string;
  image: string | null;
  variation_label: string | null;
  bundle_tier_id: string | null;
};

export type OrderWithItems = OrderRow & { items: OrderItemRow[] };
