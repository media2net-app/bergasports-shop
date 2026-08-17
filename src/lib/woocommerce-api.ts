import "server-only";

import { getRuntimeSetting } from "@/lib/site-settings-db";
import { getWcStoreBaseUrl } from "@/lib/wc-store-config";

export async function isWooCommerceApiConfigured(): Promise<boolean> {
  const [key, secret] = await Promise.all([
    getRuntimeSetting("WC_CONSUMER_KEY"),
    getRuntimeSetting("WC_CONSUMER_SECRET"),
  ]);
  return Boolean(key && secret);
}

async function getCredentials(): Promise<{ key: string; secret: string }> {
  const [key, secret] = await Promise.all([
    getRuntimeSetting("WC_CONSUMER_KEY"),
    getRuntimeSetting("WC_CONSUMER_SECRET"),
  ]);
  if (!key || !secret) {
    throw new Error("WC_CONSUMER_KEY / WC_CONSUMER_SECRET ontbreken.");
  }
  return { key, secret };
}

export type WooCommerceOrderLineItem = {
  id: number;
  name: string;
  product_id: number;
  variation_id?: number;
  quantity: number;
  total: string;
  price?: number;
  sku?: string;
};

export type WooCommerceOrder = {
  id: number;
  number: string;
  status: string;
  currency: string;
  total: string;
  discount_total: string;
  payment_method: string;
  payment_method_title: string;
  customer_note: string;
  date_created: string;
  date_created_gmt?: string;
  date_modified?: string;
  billing: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address_1?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
  shipping: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
  line_items: WooCommerceOrderLineItem[];
};

export type FetchWcOrdersResult = {
  orders: WooCommerceOrder[];
  total: number;
  totalPages: number;
  page: number;
};

export async function fetchWooCommerceOrders(options: {
  page?: number;
  perPage?: number;
  modifiedAfter?: string;
  order?: "asc" | "desc";
}): Promise<FetchWcOrdersResult> {
  const { key, secret } = await getCredentials();
  const page = Math.max(1, options.page ?? 1);
  const perPage = Math.min(100, Math.max(1, options.perPage ?? 50));
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    orderby: "date",
    order: options.order ?? "desc",
  });
  if (options.modifiedAfter) {
    params.set("modified_after", options.modifiedAfter);
  }

  const base =
    (await getRuntimeSetting("WC_STORE_BASE_URL")) || getWcStoreBaseUrl();
  const url = `${base.replace(/\/$/, "")}/wp-json/wc/v3/orders?${params}`;
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WooCommerce orders ${res.status}: ${text.slice(0, 200)}`);
  }

  const orders = (await res.json()) as WooCommerceOrder[];
  const total = Number.parseInt(res.headers.get("X-WP-Total") || "0", 10) || orders.length;
  const totalPages =
    Number.parseInt(res.headers.get("X-WP-TotalPages") || "0", 10) ||
    Math.max(1, Math.ceil(total / perPage));

  return { orders, total, totalPages, page };
}
