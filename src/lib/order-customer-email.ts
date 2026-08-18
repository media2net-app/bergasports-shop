import "server-only";

import type { OrderStatus, OrderWithItems } from "@/lib/orders";
import { sendOutboundEmail } from "@/lib/outbound-email";
import { getEmailLogoUrlSetting } from "@/lib/shop-runtime";
import { getEmailTemplate } from "@/lib/email-templates-db";
import { buildEmailVars, renderEmailTemplate } from "@/lib/email-template-render";
import type { EmailTemplateKey } from "@/lib/email-template-defs";
import type { OrderStatusEmailKind } from "@/lib/order-email-kinds";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale-codes";
import { overlayTranslation, pickTranslation, type EmailLocaleFields } from "@/lib/i18n/translations";

const ORDER_EMAIL_KEY: Record<OrderStatusEmailKind, EmailTemplateKey> = {
  received: "order.received",
  confirmed: "order.confirmed",
  shipped: "order.shipped",
  delivered: "order.delivered",
  cancelled: "order.cancelled",
};

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
  if (status === "ready_for_pickup") {
    return null;
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

  const template = await getEmailTemplate(ORDER_EMAIL_KEY[kind]);
  let locale = DEFAULT_LOCALE;
  try {
    const { getRequestLocale } = await import("@/lib/i18n/locale");
    locale = await getRequestLocale();
  } catch {
    locale = DEFAULT_LOCALE;
  }
  const overlay = pickTranslation<EmailLocaleFields>(template.translations, locale);
  const localized = overlayTranslation(
    { subject: template.subject, title: template.title, bodyHtml: template.bodyHtml },
    overlay,
  );
  const { subject, text, html } = renderEmailTemplate(
    { ...template, ...localized },
    buildEmailVars(order),
    await getEmailLogoUrlSetting(),
  );
  return sendOutboundEmail({ to: email, subject, text, html });
}
