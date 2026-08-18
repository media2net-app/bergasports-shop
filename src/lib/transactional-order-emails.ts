import type { OrderWithItems } from "@/lib/orders";
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/email-template-defs";
import {
  adminInputToPreviewOrder,
  buildEmailVars,
  renderDefaultEmailTemplate,
  renderEmailTemplate,
  type AdminOrderLike,
} from "@/lib/email-template-render";

export type OrderStatusEmailKind = "received" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type AdminNewOrderEmailInput = AdminOrderLike;

const KIND_TO_KEY = {
  received: "order.received",
  confirmed: "order.confirmed",
  shipped: "order.shipped",
  delivered: "order.delivered",
  cancelled: "order.cancelled",
} as const;

export function buildOrderStatusEmailParts(
  kind: OrderStatusEmailKind,
  order: OrderWithItems,
  logoUrl?: string,
): { subject: string; text: string; html: string } {
  return renderDefaultEmailTemplate(KIND_TO_KEY[kind], order, logoUrl);
}

export function buildAdminNewOrderEmailParts(
  input: AdminNewOrderEmailInput,
  logoUrl?: string,
): { subject: string; text: string; html: string } {
  return renderDefaultEmailTemplate("order.admin_new", adminInputToPreviewOrder(input), logoUrl);
}

export function buildAdminNewOrderTestEmailParts(
  input: AdminNewOrderEmailInput,
  subjectPrefix: string,
  logoUrl?: string,
): { subject: string; text: string; html: string } {
  const def = DEFAULT_EMAIL_TEMPLATES["order.admin_new"];
  const order = adminInputToPreviewOrder(input);
  return renderEmailTemplate(
    {
      subject: `${subjectPrefix}${def.subject}`,
      title: "Nieuwe bestelling (test)",
      bodyHtml: `<p>Dit is een test-e-mail (SMTP).</p>\n${def.bodyHtml}`,
    },
    buildEmailVars(order),
    logoUrl,
  );
}
