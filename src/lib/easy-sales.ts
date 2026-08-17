import "server-only";

import type { CreateOrderInput } from "@/lib/orders";
import { getRuntimeSetting } from "@/lib/site-settings-db";

const DEFAULT_BASE_URL = "https://easy-sales.com/api/v2";

export type EasySalesConfig = {
  enabled: boolean;
  apiToken: string;
  websiteToken: string;
  baseUrl: string;
  clientId?: string;
  clientSecret?: string;
};

export async function getEasySalesConfig(): Promise<EasySalesConfig | null> {
  const [apiToken, websiteToken, baseUrlRaw, clientId, clientSecret] = await Promise.all([
    getRuntimeSetting("EASY_SALES_API_TOKEN"),
    getRuntimeSetting("EASY_SALES_WEBSITE_TOKEN"),
    getRuntimeSetting("EASY_SALES_API_BASE_URL"),
    getRuntimeSetting("EASY_SALES_CLIENT_ID"),
    getRuntimeSetting("EASY_SALES_CLIENT_SECRET"),
  ]);
  if (!apiToken || !websiteToken) return null;

  const baseUrl = (baseUrlRaw.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");

  return {
    enabled: true,
    apiToken,
    websiteToken,
    baseUrl,
    clientId: clientId.trim() || undefined,
    clientSecret: clientSecret.trim() || undefined,
  };
}

type EasySalesApiResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

export class EasySalesApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "EasySalesApiError";
  }
}

export async function resolveEasySalesAccessToken(config: EasySalesConfig): Promise<string> {
  if (!config.clientId || !config.clientSecret) {
    return config.apiToken;
  }

  const oauthBase = config.baseUrl.replace(/\/api\/v2\/?$/, "");
  const res = await fetch(`${oauthBase}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "website",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      website_token: config.websiteToken,
      scope:
        "add-orders read-orders read-websites-list read-customers update-customers read-products update-products",
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    return config.apiToken;
  }

  try {
    const json = JSON.parse(text) as { access_token?: string };
    return json.access_token?.trim() || config.apiToken;
  } catch {
    return config.apiToken;
  }
}

export async function easySalesRequest(
  config: EasySalesConfig,
  path: string,
  init: RequestInit = {},
): Promise<EasySalesApiResponse> {
  const accessToken = await resolveEasySalesAccessToken(config);
  const url = `${config.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const text = await res.text();
  let json: EasySalesApiResponse = {};
  if (text) {
    try {
      json = JSON.parse(text) as EasySalesApiResponse;
    } catch {
      json = { message: text };
    }
  }

  if (!res.ok || json.success === false) {
    throw new EasySalesApiError(
      json.message ?? `Easy-Sales API error (${res.status})`,
      res.status,
      text,
    );
  }

  return json;
}

function formatEasySalesDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function mapCurrency(currency: string): string {
  const c = currency.trim().toLowerCase();
  if (c === "lei" || c === "ron") return "RON";
  return currency.trim().toUpperCase() || "RON";
}

function mapPaymentMode(paymentMethod: string): number {
  if (paymentMethod === "card" || paymentMethod === "online") return 2;
  return 1;
}

export function buildEasySalesOrderPayload(
  input: CreateOrderInput & { orderNumber: string; createdAt?: string },
  websiteToken: string,
) {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const paymentMethod = input.paymentMethod ?? "cash_on_delivery";
  const currency = mapCurrency(input.currency);
  const county = input.shippingCounty?.trim() || "";
  const postalCode = input.shippingPostalCode?.trim() || "";

  const address = {
    name: input.customerName.trim(),
    phone: input.customerPhone.trim(),
    country: "RO",
    county,
    city: input.shippingCity.trim(),
    street: input.shippingAddress.trim(),
    postal_code: postalCode,
  };

  const customer = {
    name: input.customerName.trim(),
    company_name: "",
    phone: input.customerPhone.trim(),
    email: input.customerEmail?.trim() || "",
    fax: null,
    identification_number: null,
    legal_entity: 0,
    bank: null,
    iban: null,
    vat_id: null,
    registration_number: null,
    vat_payer: null,
  };

  const orderProducts = input.items.map((item) => ({
    product_website_id: String(item.productId),
    sku: item.sku?.trim() || item.lineId,
    name: item.name,
    quantity: item.quantity,
    price: item.unitPrice,
    total: item.lineTotal,
    tax: 0,
    properties: item.variationLabel ? [{ name: "variant", value: item.variationLabel }] : [],
  }));

  return {
    website_token: websiteToken,
    source: "api",
    order: {
      order_id: input.orderNumber,
      invoice_series: "",
      order_date: formatEasySalesDate(createdAt),
      order_total: input.total,
      currency,
      status: 1,
      payment_mode: mapPaymentMode(paymentMethod),
      shipment_tax: 0,
      observations: input.notes?.trim() || "",
      total_vouchers: "0",
      customer,
      shipping_address: address,
      billing_address: address,
      order_products: orderProducts,
      shipment: { tax: 0, price_with_tax: 0 },
      fees: [],
      vouchers: [],
      original_data: {
        payment_method: paymentMethod,
        store: "e-store-house",
      },
    },
  };
}

export type EasySalesSyncResult =
  | { ok: true; response: EasySalesApiResponse }
  | { ok: false; error: string; status?: number };

export async function syncOrderToEasySales(
  input: CreateOrderInput & { orderNumber: string; createdAt?: string },
): Promise<EasySalesSyncResult> {
  const config = await getEasySalesConfig();
  if (!config) {
    return { ok: false, error: "Easy-Sales is not configured (missing API token or website token)." };
  }

  const payload = buildEasySalesOrderPayload(input, config.websiteToken);

  try {
    const response = await easySalesRequest(config, "/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { ok: true, response };
  } catch (e) {
    if (e instanceof EasySalesApiError) {
      return { ok: false, error: e.message, status: e.status };
    }
    const message = e instanceof Error ? e.message : "Easy-Sales sync failed";
    return { ok: false, error: message };
  }
}

export async function testEasySalesConnection(): Promise<{
  ok: boolean;
  message: string;
  websites?: unknown;
}> {
  const config = await getEasySalesConfig();
  if (!config) {
    return {
      ok: false,
      message: "Set EASY_SALES_API_TOKEN and EASY_SALES_WEBSITE_TOKEN in the environment.",
    };
  }

  try {
    const response = await easySalesRequest(config, "/websites/list");
    return { ok: true, message: "Connected to Easy-Sales.", websites: response.data };
  } catch (e) {
    let message = e instanceof EasySalesApiError ? e.message : e instanceof Error ? e.message : "Connection failed";
    if (e instanceof EasySalesApiError && e.status === 401) {
      message =
        "Unauthenticated — regenerate Personal Access Token in Easy-Sales (API Settings) or add EASY_SALES_CLIENT_SECRET for website grant.";
    }
    return { ok: false, message };
  }
}
