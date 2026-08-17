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
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

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
