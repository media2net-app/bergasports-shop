import { mollieMethodLabel } from "@/lib/mollie-methods";

export const ORDER_STATUSES = [
  "awaiting_payment",
  "pending",
  "confirmed",
  "processing",
  "ready_for_pickup",
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
  ready_for_pickup: "Klaar voor ophalen",
  shipped: "Verzonden",
  delivered: "Opgehaald",
  cancelled: "Geannuleerd",
};

export const SHIPPING_OPS_STATUSES = [
  "processing",
  "ready_for_pickup",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type ShippingOpsStatus = (typeof SHIPPING_OPS_STATUSES)[number];

export const SHIPPING_OPS_LABEL: Record<ShippingOpsStatus, string> = {
  processing: "In behandeling",
  ready_for_pickup: "Klaar voor ophalen",
  shipped: "Verzonden",
  delivered: "Opgehaald",
  cancelled: "Geannuleerd",
};

export const PAYMENT_OPS_STATUSES = ["open", "paid", "refunded", "failed"] as const;

export type PaymentOpsStatus = (typeof PAYMENT_OPS_STATUSES)[number];

export const PAYMENT_OPS_LABEL: Record<PaymentOpsStatus, string> = {
  open: "Open",
  paid: "Betaald",
  refunded: "Terugbetaald",
  failed: "Mislukt",
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

/** True for bare `mollie` and method-specific ids like `mollie:ideal`. */
export function isMolliePaymentMethod(method: string | null | undefined): boolean {
  const m = method?.trim().toLowerCase() ?? "";
  return m === "mollie" || m.startsWith("mollie:");
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
    case "ready_for_pickup":
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

export function paymentOpsStatus(status: string | null | undefined): PaymentOpsStatus {
  switch ((status ?? "").toLowerCase()) {
    case "paid":
    case "authorized":
      return "paid";
    case "refunded":
    case "partially_refunded":
      return "refunded";
    case "failed":
    case "expired":
    case "canceled":
    case "cancelled":
      return "failed";
    default:
      return "open";
  }
}

export function shippingOpsStatus(status: OrderStatus): ShippingOpsStatus {
  if (status === "ready_for_pickup" || status === "shipped" || status === "delivered" || status === "cancelled") {
    return status;
  }
  return "processing";
}

export function isPaidPaymentStatus(status: string | null | undefined): boolean {
  const value = (status ?? "").toLowerCase();
  return value === "paid" || value === "authorized";
}

export function isPickupShippingLabel(label: string | null | undefined): boolean {
  return /afhalen|ophalen|pickup/i.test(label ?? "");
}

export type OrderBillingAddress = {
  address: string;
  postal_code: string;
  city: string;
  county: string;
};

export type OrderCheckoutMeta = {
  shippingLabel: string | null;
  shippingCountry: string | null;
  couponCode: string | null;
  customerNote: string | null;
  internalNote: string | null;
  billing: OrderBillingAddress | null;
};

const NOTE_PREFIX = {
  shipping: /^Verzending:\s*/i,
  land: /^Land:\s*/i,
  coupon: /^Coupon:\s*/i,
  intern: /^Intern:\s*/i,
  billAddr: /^Factuuradres:\s*/i,
  billPostal: /^Factuurpostcode:\s*/i,
  billCity: /^Factuurplaats:\s*/i,
  billCounty: /^Factuurland:\s*/i,
};

function isMetaNoteLine(line: string): boolean {
  return Object.values(NOTE_PREFIX).some((pattern) => pattern.test(line));
}

function stripPrefix(line: string, pattern: RegExp): string {
  return line.replace(pattern, "").trim();
}

export function parseOrderCheckoutNotes(notes: string | null | undefined): OrderCheckoutMeta {
  const lines = (notes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const shippingLine = lines.find((line) => NOTE_PREFIX.shipping.test(line));
  const landLine = lines.find((line) => NOTE_PREFIX.land.test(line));
  const couponLine = lines.find((line) => NOTE_PREFIX.coupon.test(line));
  const internLines = lines.filter((line) => NOTE_PREFIX.intern.test(line)).map((line) => stripPrefix(line, NOTE_PREFIX.intern));
  const billAddr = lines.find((line) => NOTE_PREFIX.billAddr.test(line));
  const billPostal = lines.find((line) => NOTE_PREFIX.billPostal.test(line));
  const billCity = lines.find((line) => NOTE_PREFIX.billCity.test(line));
  const billCounty = lines.find((line) => NOTE_PREFIX.billCounty.test(line));
  const customerNote = lines.filter((line) => !isMetaNoteLine(line)).join("\n").trim();
  const billingAddress = stripPrefix(billAddr ?? "", NOTE_PREFIX.billAddr);
  const billingPostal = stripPrefix(billPostal ?? "", NOTE_PREFIX.billPostal);
  const billingCity = stripPrefix(billCity ?? "", NOTE_PREFIX.billCity);
  const billingCounty = stripPrefix(billCounty ?? "", NOTE_PREFIX.billCounty);
  const billing =
    billingAddress || billingPostal || billingCity || billingCounty
      ? {
          address: billingAddress,
          postal_code: billingPostal,
          city: billingCity,
          county: billingCounty,
        }
      : null;
  return {
    shippingLabel: shippingLine ? stripPrefix(shippingLine, NOTE_PREFIX.shipping) || null : null,
    shippingCountry: landLine ? stripPrefix(landLine, NOTE_PREFIX.land).toUpperCase() || null : null,
    couponCode: couponLine ? stripPrefix(couponLine, NOTE_PREFIX.coupon) || null : null,
    customerNote: customerNote || null,
    internalNote: internLines.join("\n").trim() || null,
    billing,
  };
}

export function serializeOrderCheckoutNotes(meta: OrderCheckoutMeta): string | null {
  const lines: string[] = [];
  if (meta.customerNote?.trim()) lines.push(meta.customerNote.trim());
  if (meta.shippingLabel?.trim()) lines.push(`Verzending: ${meta.shippingLabel.trim()}`);
  if (meta.shippingCountry?.trim()) lines.push(`Land: ${meta.shippingCountry.trim().toUpperCase()}`);
  if (meta.couponCode?.trim()) lines.push(`Coupon: ${meta.couponCode.trim()}`);
  if (meta.internalNote?.trim()) {
    for (const part of meta.internalNote.split("\n")) {
      lines.push(`Intern: ${part}`);
    }
  }
  if (meta.billing && (meta.billing.address || meta.billing.postal_code || meta.billing.city || meta.billing.county)) {
    if (meta.billing.address.trim()) lines.push(`Factuuradres: ${meta.billing.address.trim()}`);
    if (meta.billing.postal_code.trim()) lines.push(`Factuurpostcode: ${meta.billing.postal_code.trim()}`);
    if (meta.billing.city.trim()) lines.push(`Factuurplaats: ${meta.billing.city.trim()}`);
    if (meta.billing.county.trim()) lines.push(`Factuurland: ${meta.billing.county.trim()}`);
  }
  return lines.length ? lines.join("\n") : null;
}

export function mergeOrderCheckoutNotes(
  notes: string | null | undefined,
  patch: Partial<Pick<OrderCheckoutMeta, "internalNote" | "billing" | "shippingLabel" | "shippingCountry">>,
): string | null {
  const meta = parseOrderCheckoutNotes(notes);
  if (patch.internalNote !== undefined) meta.internalNote = patch.internalNote?.trim() || null;
  if (patch.billing !== undefined) meta.billing = patch.billing;
  if (patch.shippingLabel !== undefined) meta.shippingLabel = patch.shippingLabel?.trim() || null;
  if (patch.shippingCountry !== undefined) meta.shippingCountry = patch.shippingCountry?.trim().toUpperCase() || null;
  return serializeOrderCheckoutNotes(meta);
}

function normAddressPart(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function orderAddressesDiffer(
  shipping: { address: string; postal_code: string | null; city: string; county: string | null },
  billing: OrderBillingAddress | null,
): boolean {
  if (!billing) return false;
  return (
    normAddressPart(shipping.address) !== normAddressPart(billing.address) ||
    normAddressPart(shipping.postal_code) !== normAddressPart(billing.postal_code) ||
    normAddressPart(shipping.city) !== normAddressPart(billing.city) ||
    normAddressPart(shipping.county) !== normAddressPart(billing.county)
  );
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
