import type { OrderItemRow, OrderWithItems } from "@/lib/orders";
import { LEGAL_PAGE_PATHS } from "@/lib/site-content";
import type { EmailTemplateDraft, EmailTemplateKey } from "@/lib/email-template-defs";
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/email-template-defs";
import { mollieMethodLabel } from "@/lib/mollie-methods";
import { resolveSiteEmailLogoUrl } from "@/lib/site-brand";
import {
  emailButton,
  emailInfoBox,
  emailOrderItemsBlock,
  escapeHtml,
  formatEmailMoney,
  transactionalEmailSiteUrl,
  wrapTransactionalEmailHtml,
} from "@/lib/transactional-email-layout";

export type EmailVar = { html: string; text: string };

export type EmailRenderInput = {
  subject: string;
  title: string;
  bodyHtml: string;
};

export type EmailTemplateExtraVars = {
  winBackCode?: string;
  winBackExpiry?: string;
  welcomeCode?: string;
};

const TOKEN_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;
const WRAPPED_TOKEN_RE =
  /<(?:p|h[1-6])>\s*(?:<span[^>]*>\s*)?(\{\{\s*[a-z0-9_]+\s*\}\})(?:\s*<\/span>)?\s*<\/(?:p|h[1-6])>/gi;

function emptyVar(): EmailVar {
  return { html: "", text: "" };
}

function textVar(value: string): EmailVar {
  const text = value.trim();
  return { html: escapeHtml(text), text };
}

function htmlVar(html: string, text: string): EmailVar {
  return { html, text };
}

function formatOrderDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("nl-NL", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Amsterdam",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function paymentMethodLabel(method: string): string {
  const m = method.trim().toLowerCase();
  if (m === "cash_on_delivery" || m === "ramburs" || m === "cod") {
    return "Rembours (bij aflevering)";
  }
  if (m.startsWith("mollie:")) return mollieMethodLabel(m.slice("mollie:".length));
  if (m === "mollie" || m === "online" || m === "card") {
    return "Online (Mollie)";
  }
  return mollieMethodLabel(m);
}

export function shippingAddressLine(
  order: Pick<OrderWithItems, "shipping_address" | "shipping_city" | "shipping_county" | "shipping_postal_code">,
): string {
  return [order.shipping_address, order.shipping_city, order.shipping_county, order.shipping_postal_code]
    .filter(Boolean)
    .join(", ");
}

function orderLinesPlain(order: Pick<OrderWithItems, "items" | "currency">): string[] {
  return order.items.map((item) => {
    const v = item.variation_label ? ` (${item.variation_label})` : "";
    const unit = formatEmailMoney(item.unit_price, item.currency || order.currency);
    const line = formatEmailMoney(item.line_total, item.currency || order.currency);
    return `${item.name}${v} × ${item.quantity} — ${line} (${unit}/st.)`;
  });
}

function orderProductsPlain(order: Pick<OrderWithItems, "items" | "currency" | "subtotal" | "discount_total" | "total">): string {
  if (!order.items.length) return "";
  return [
    "Producten:",
    ...orderLinesPlain(order).map((l) => `• ${l}`),
    `Subtotaal: ${formatEmailMoney(order.subtotal, order.currency)}`,
    ...(order.discount_total > 0.005
      ? [`Korting: −${formatEmailMoney(order.discount_total, order.currency)}`]
      : []),
    `Totaal: ${formatEmailMoney(order.total, order.currency)}`,
  ].join("\n");
}

function orderSummaryRows(
  order: Pick<
    OrderWithItems,
    | "order_number"
    | "created_at"
    | "customer_name"
    | "customer_email"
    | "customer_phone"
    | "payment_method"
    | "notes"
    | "shipping_address"
    | "shipping_city"
    | "shipping_county"
    | "shipping_postal_code"
  >,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [
    { label: "Bestelnummer", value: order.order_number },
    { label: "Besteldatum", value: formatOrderDate(order.created_at) },
    { label: "Klant", value: order.customer_name },
    { label: "Telefoon", value: order.customer_phone },
  ];
  if (order.customer_email) {
    rows.push({ label: "E-mail", value: order.customer_email });
  }
  rows.push(
    { label: "Betaling", value: paymentMethodLabel(order.payment_method) },
    { label: "Bezorging", value: shippingAddressLine(order) },
  );
  if (order.notes?.trim()) {
    rows.push({ label: "Opmerkingen", value: order.notes.trim() });
  }
  return rows;
}

function trackingLine(order: Pick<OrderWithItems, "tracking_url" | "tracking_code">): string {
  if (order.tracking_url?.trim()) {
    return `Volg je zending: ${order.tracking_url.trim()}`;
  }
  if (order.tracking_code?.trim()) {
    return `Je trackingcode is ${order.tracking_code.trim()}.`;
  }
  return "De bezorger neemt telefonisch contact op voor de levering. Houd je telefoonnummer bij de hand.";
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function htmlToPlainText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function applyVars(template: string, vars: Record<string, EmailVar>, mode: "html" | "text"): string {
  return template.replace(TOKEN_RE, (_, key: string) => {
    const found = vars[key.toLowerCase()];
    if (!found) return "";
    return mode === "html" ? found.html : found.text;
  });
}

function prepareBodyHtml(bodyHtml: string): string {
  return bodyHtml.replace(WRAPPED_TOKEN_RE, "$1");
}

export function buildEmailVars(
  order: OrderWithItems | null,
  extra?: EmailTemplateExtraVars,
): Record<string, EmailVar> {
  const shop = transactionalEmailSiteUrl();
  const returnsUrl = `${shop}${LEGAL_PAGE_PATHS.returns}`;
  const adminUrl = `${shop}/admin/orders`;
  const currency = order?.currency ?? "EUR";
  const items = order?.items ?? [];
  const totals = {
    subtotal: order?.subtotal ?? 0,
    discountTotal: order?.discount_total ?? 0,
    total: order?.total ?? 0,
    currency,
  };
  const trackUrl = order?.tracking_url?.trim() ?? "";
  const trackCode = order?.tracking_code?.trim() ?? "";

  const vars: Record<string, EmailVar> = {
    customer_name: textVar(order?.customer_name ?? ""),
    order_number: textVar(order?.order_number ?? ""),
    order_date: textVar(order?.created_at ? formatOrderDate(order.created_at) : ""),
    customer_email: textVar(order?.customer_email ?? ""),
    customer_phone: textVar(order?.customer_phone ?? ""),
    shipping_address: textVar(order ? shippingAddressLine(order) : ""),
    payment_method: textVar(order ? paymentMethodLabel(order.payment_method) : ""),
    notes: textVar(order?.notes ?? ""),
    total: textVar(order ? formatEmailMoney(order.total, currency) : ""),
    subtotal: textVar(order ? formatEmailMoney(order.subtotal, currency) : ""),
    discount: textVar(order && order.discount_total > 0.005 ? formatEmailMoney(order.discount_total, currency) : ""),
    tracking_code: textVar(trackCode),
    tracking_url: textVar(trackUrl),
    tracking_line: textVar(order ? trackingLine(order) : ""),
    shop_url: textVar(`${shop}/shop`),
    returns_url: textVar(returnsUrl),
    admin_orders_url: textVar(adminUrl),
    winback_code: textVar(extra?.winBackCode ?? ""),
    winback_expiry: textVar(extra?.winBackExpiry ?? ""),
    welcome_code: textVar(extra?.welcomeCode ?? ""),
    order_summary: order
      ? htmlVar(
          emailInfoBox("Bestelgegevens", orderSummaryRows(order)),
          orderSummaryRows(order)
            .map((row) => `${row.label}: ${row.value}`)
            .join("\n"),
        )
      : emptyVar(),
    order_items: items.length
      ? htmlVar(emailOrderItemsBlock(items, totals), order && items.length ? orderProductsPlain(order) : "")
      : emptyVar(),
    button_shop: htmlVar(emailButton(`${shop}/shop`, "Naar de webshop"), `Bekijk de webshop: ${shop}/shop`),
    button_returns: htmlVar(emailButton(returnsUrl, "Retourneren"), `Retourbeleid: ${returnsUrl}`),
    button_track: trackUrl
      ? htmlVar(emailButton(trackUrl, "Volg je zending"), `Volg je zending: ${trackUrl}`)
      : emptyVar(),
    button_admin: htmlVar(emailButton(adminUrl, "Bestellingen in admin"), `Open admin: ${adminUrl}`),
  };

  return vars;
}

export function renderEmailTemplate(
  draft: EmailRenderInput,
  vars: Record<string, EmailVar>,
  logoUrl?: string,
): { subject: string; text: string; html: string } {
  const subject = applyVars(draft.subject, vars, "text").replace(/\s+/g, " ").trim();
  const title = applyVars(draft.title, vars, "text").replace(/\s+/g, " ").trim() || subject;
  const body = applyVars(prepareBodyHtml(draft.bodyHtml), vars, "html");
  const textBody = htmlToPlainText(applyVars(prepareBodyHtml(draft.bodyHtml), vars, "html"));
  const shop = transactionalEmailSiteUrl();

  const html = wrapTransactionalEmailHtml({
    preheader: subject,
    title,
    innerHtml: body,
    siteUrl: shop,
    logoUrl: logoUrl?.trim() || resolveSiteEmailLogoUrl(),
  });

  const text = [
    textBody,
    "",
    "—",
    "Bergasports",
    shop,
    "Vragen? Antwoord op deze e-mail of neem contact op via de website.",
  ].join("\n");

  return { subject, text, html };
}

export function defaultTemplate(key: EmailTemplateKey): EmailTemplateDraft {
  return DEFAULT_EMAIL_TEMPLATES[key];
}

export function renderDefaultEmailTemplate(
  key: EmailTemplateKey,
  order: OrderWithItems | null,
  logoUrl?: string,
  extra?: EmailTemplateExtraVars,
): { subject: string; text: string; html: string } {
  return renderEmailTemplate(DEFAULT_EMAIL_TEMPLATES[key], buildEmailVars(order, extra), logoUrl);
}

export type AdminOrderLike = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  total: number;
  currency: string;
  subtotal?: number;
  discountTotal?: number;
  shippingAddress?: string;
  shippingCity: string;
  shippingCounty?: string;
  shippingPostalCode?: string;
  notes?: string;
  paymentMethod?: string;
  items?: OrderItemRow[];
};

export function adminInputToPreviewOrder(input: AdminOrderLike): OrderWithItems {
  const items = input.items ?? [];
  return {
    id: 0,
    order_number: input.orderNumber,
    status: "confirmed",
    customer_name: input.customerName,
    customer_email: input.customerEmail ?? null,
    customer_phone: input.customerPhone,
    shipping_address: input.shippingAddress ?? "",
    shipping_city: input.shippingCity,
    shipping_county: input.shippingCounty ?? null,
    shipping_postal_code: input.shippingPostalCode ?? null,
    notes: input.notes ?? null,
    payment_method: input.paymentMethod ?? "mollie",
    mollie_payment_id: null,
    currency: input.currency,
    subtotal: input.subtotal ?? input.total,
    discount_total: input.discountTotal ?? 0,
    total: input.total,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    easy_sales_sync_status: null,
    easy_sales_sync_error: null,
    easy_sales_synced_at: null,
    status_emails_sent: null,
    marketing_consent: false,
    tracking_code: null,
    tracking_url: null,
    shipping_carrier: null,
    sendcloud_parcel_id: null,
    sendcloud_label_url: null,
    refunded_at: null,
    refund_amount: null,
    payment_status: null,
    items,
  };
}

export function customerOnlyOrder(customerName: string): OrderWithItems {
  return {
    id: 0,
    order_number: "",
    status: "confirmed",
    customer_name: customerName,
    customer_email: null,
    customer_phone: "",
    shipping_address: "",
    shipping_city: "",
    shipping_county: null,
    shipping_postal_code: null,
    notes: null,
    payment_method: "",
    mollie_payment_id: null,
    currency: "EUR",
    subtotal: 0,
    discount_total: 0,
    total: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    easy_sales_sync_status: null,
    easy_sales_sync_error: null,
    easy_sales_synced_at: null,
    status_emails_sent: null,
    marketing_consent: false,
    tracking_code: null,
    tracking_url: null,
    shipping_carrier: null,
    sendcloud_parcel_id: null,
    sendcloud_label_url: null,
    refunded_at: null,
    refund_amount: null,
    payment_status: null,
    items: [],
  };
}

export function withShippedPreview(order: OrderWithItems): OrderWithItems {
  if (order.tracking_url || order.tracking_code) return order;
  const shop = transactionalEmailSiteUrl();
  return {
    ...order,
    tracking_code: "3SBERG123456789",
    tracking_url: `${shop}/verzending`,
  };
}
