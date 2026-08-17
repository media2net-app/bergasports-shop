import type { OrderItemRow, OrderWithItems } from "@/lib/orders";
import { resolveSiteEmailLogoUrl } from "@/lib/site-brand";
import { LEGAL_PAGE_PATHS } from "@/lib/site-content";
import {
  emailButton,
  emailDetailTable,
  emailInfoBox,
  emailOrderItemsBlock,
  emailParagraph,
  formatEmailMoney,
  transactionalEmailSiteUrl,
  wrapTransactionalEmailHtml,
} from "@/lib/transactional-email-layout";

export type OrderStatusEmailKind = "received" | "confirmed" | "shipped" | "delivered" | "cancelled";

function logoUrlFromOpts(logoUrl?: string): string {
  return logoUrl?.trim() || resolveSiteEmailLogoUrl();
}

function shippingAddressLine(order: Pick<OrderWithItems, "shipping_address" | "shipping_city" | "shipping_county" | "shipping_postal_code">): string {
  return [order.shipping_address, order.shipping_city, order.shipping_county, order.shipping_postal_code]
    .filter(Boolean)
    .join(", ");
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

function paymentMethodLabel(method: string): string {
  const m = method.trim().toLowerCase();
  if (m === "cash_on_delivery" || m === "ramburs" || m === "cod") {
    return "Rembours (bij aflevering)";
  }
  if (m === "mollie" || m === "ideal" || m === "card" || m === "online") {
    return "Online (Mollie)";
  }
  return method;
}

function footerText(shop: string): string {
  return [
    "—",
    "Bergasports",
    shop,
    "Vragen? Antwoord op deze e-mail of neem contact op via de website.",
  ].join("\n");
}

function orderLinesPlain(order: OrderWithItems): string[] {
  return order.items.map((item) => {
    const v = item.variation_label ? ` (${item.variation_label})` : "";
    const unit = formatEmailMoney(item.unit_price, item.currency || order.currency);
    const line = formatEmailMoney(item.line_total, item.currency || order.currency);
    return `${item.name}${v} × ${item.quantity} — ${line} (${unit}/st.)`;
  });
}

function orderMetaPlain(order: OrderWithItems): string[] {
  return [
    `Bestelnummer: ${order.order_number}`,
    `Datum: ${formatOrderDate(order.created_at)}`,
    `Telefoon: ${order.customer_phone}`,
    ...(order.customer_email ? [`E-mail: ${order.customer_email}`] : []),
    `Betaling: ${paymentMethodLabel(order.payment_method)}`,
    `Bezorging: ${shippingAddressLine(order)}`,
    ...(order.notes?.trim() ? [`Opmerkingen: ${order.notes.trim()}`] : []),
  ];
}

function orderProductsPlainSection(order: OrderWithItems): string[] {
  if (!order.items.length) {
    return [];
  }
  return [
    "",
    "Producten:",
    ...orderLinesPlain(order).map((l) => `• ${l}`),
    "",
    `Subtotaal: ${formatEmailMoney(order.subtotal, order.currency)}`,
    ...(order.discount_total > 0.005
      ? [`Korting: −${formatEmailMoney(order.discount_total, order.currency)}`]
      : []),
    `Totaal: ${formatEmailMoney(order.total, order.currency)}`,
  ];
}

function orderSummaryInfoBox(order: OrderWithItems): string {
  const rows: { label: string; value: string }[] = [
    { label: "Bestelnummer", value: order.order_number },
    { label: "Besteldatum", value: formatOrderDate(order.created_at) },
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
  return emailInfoBox("Bestelgegevens", rows);
}

function orderProductsHtml(order: OrderWithItems): string {
  return emailOrderItemsBlock(order.items, {
    subtotal: order.subtotal,
    discountTotal: order.discount_total,
    total: order.total,
    currency: order.currency,
  });
}

type CustomerEmailSpec = {
  kind: OrderStatusEmailKind;
  subject: string;
  title: string;
  intro: string[];
  extraHtml?: string;
  extraPlain?: string[];
  showShopButton?: boolean;
  includeProducts?: boolean;
};

function buildCustomerStatusEmail(
  order: OrderWithItems,
  spec: CustomerEmailSpec,
  logoUrl?: string,
): { subject: string; text: string; html: string } {
  const shop = transactionalEmailSiteUrl();
  const resolvedLogo = logoUrlFromOpts(logoUrl);
  const includeProducts = spec.includeProducts !== false;

  const text = [
    `Hallo ${order.customer_name},`,
    "",
    ...spec.intro,
    "",
    ...orderMetaPlain(order),
    ...(includeProducts ? orderProductsPlainSection(order) : []),
    ...(spec.extraPlain ?? []),
    "",
    ...(spec.showShopButton ? [`Bekijk de webshop: ${shop}/shop`, ""] : []),
    footerText(shop),
  ].join("\n");

  const inner = [
    emailParagraph(`Hallo ${order.customer_name},`),
    ...spec.intro.map((p) => emailParagraph(p)),
    orderSummaryInfoBox(order),
    ...(includeProducts ? [orderProductsHtml(order)] : []),
    ...(spec.extraHtml ? [spec.extraHtml] : []),
    ...(spec.showShopButton ? [emailButton(`${shop}/shop`, "Naar de webshop")] : []),
  ].join("");

  const html = wrapTransactionalEmailHtml({
    preheader: spec.subject,
    title: spec.title,
    innerHtml: inner,
    siteUrl: shop,
    logoUrl: resolvedLogo,
  });

  return { subject: spec.subject, text, html };
}

export function buildOrderStatusEmailParts(
  kind: OrderStatusEmailKind,
  order: OrderWithItems,
  logoUrl?: string,
): { subject: string; text: string; html: string } {
  const nr = order.order_number;
  const mail = (spec: CustomerEmailSpec) => buildCustomerStatusEmail(order, spec, logoUrl);

  switch (kind) {
    case "received":
      return mail({
        kind,
        subject: `Bestelling ${nr} ontvangen`,
        title: "Je bestelling is ontvangen",
        intro: [
          "Bedankt voor je bestelling! We hebben je order geregistreerd en verwerken deze zo snel mogelijk.",
          "Je betaalt rembours bij aflevering van het pakket.",
        ],
        showShopButton: true,
      });
    case "confirmed":
      return mail({
        kind,
        subject: `Bestelling ${nr} bevestigd`,
        title: "Bestelling bevestigd",
        intro: [
          "Je bestelling is bevestigd en wordt klaargemaakt voor verzending.",
          "We laten het weten zodra het pakket onderweg is.",
        ],
      });
    case "shipped":
      return mail({
        kind,
        subject: `Bestelling ${nr} verzonden`,
        title: "Bestelling verzonden",
        intro: [
          "Goed nieuws — je pakket is onderweg.",
          order.tracking_url
            ? `Volg je zending: ${order.tracking_url}`
            : order.tracking_code
              ? `Je trackingcode is ${order.tracking_code}.`
              : "De bezorger neemt telefonisch contact op voor de levering. Houd je telefoonnummer bij de hand.",
        ],
      });
    case "delivered": {
      const shop = transactionalEmailSiteUrl();
      return mail({
        kind,
        subject: `Bestelling ${nr} geleverd`,
        title: "Bestelling geleverd",
        intro: [
          "Je bestelling is geleverd. We hopen dat je tevreden bent!",
          "Voor retour (14 dagen) kun je ons retourbeleid op de website bekijken.",
        ],
        extraHtml: [
          emailButton(`${shop}${LEGAL_PAGE_PATHS.returns}`, "Retourneren"),
          emailButton(`${shop}/shop`, "Opnieuw bestellen"),
        ].join(""),
        extraPlain: [
          `Retourbeleid: ${shop}${LEGAL_PAGE_PATHS.returns}`,
          `Opnieuw bestellen: ${shop}/shop`,
        ],
        includeProducts: true,
      });
    }
    case "cancelled":
      return mail({
        kind,
        subject: `Bestelling ${nr} geannuleerd`,
        title: "Bestelling geannuleerd",
        intro: [
          "Je bestelling is geannuleerd.",
          "Heb je de annulering niet aangevraagd of heb je vragen? Neem zo snel mogelijk contact met ons op.",
        ],
        includeProducts: true,
      });
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export type AdminNewOrderEmailInput = {
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

function adminShippingLine(input: AdminNewOrderEmailInput): string {
  return [input.shippingAddress, input.shippingCity, input.shippingCounty, input.shippingPostalCode]
    .filter(Boolean)
    .join(", ");
}

function buildAdminNewOrderInner(input: AdminNewOrderEmailInput, leadParagraphs: string[]): string {
  const rows: { label: string; value: string }[] = [
    { label: "Bestelling", value: input.orderNumber },
    { label: "Klant", value: input.customerName },
    { label: "Telefoon", value: input.customerPhone },
  ];
  if (input.customerEmail?.trim()) {
    rows.push({ label: "E-mail", value: input.customerEmail.trim() });
  }
  if (input.shippingAddress || input.shippingCity) {
    rows.push({ label: "Bezorging", value: adminShippingLine(input) });
  } else {
    rows.push({ label: "Plaats", value: input.shippingCity });
  }
  if (input.paymentMethod) {
    rows.push({ label: "Betaling", value: paymentMethodLabel(input.paymentMethod) });
  }
  if (input.notes?.trim()) {
    rows.push({ label: "Opmerkingen", value: input.notes.trim() });
  }
  rows.push({ label: "Totaal", value: formatEmailMoney(input.total, input.currency) });

  const itemsBlock = input.items?.length
    ? emailOrderItemsBlock(input.items, {
        subtotal: input.subtotal ?? input.items.reduce((sum, item) => sum + item.line_total, 0),
        discountTotal: input.discountTotal ?? 0,
        total: input.total,
        currency: input.currency,
      })
    : "";

  return [
    ...leadParagraphs.map((p) => emailParagraph(p)),
    emailDetailTable(rows),
    itemsBlock,
  ].join("");
}

export function buildAdminNewOrderEmailParts(
  input: AdminNewOrderEmailInput,
  logoUrl?: string,
): { subject: string; text: string; html: string } {
  const shop = transactionalEmailSiteUrl();
  const adminUrl = `${shop}/admin/orders`;
  const subject = `Nieuwe bestelling ${input.orderNumber}`;
  const plainItems =
    input.items?.map((item) => {
      const v = item.variation_label ? ` (${item.variation_label})` : "";
      return `• ${item.name}${v} × ${item.quantity} — ${formatEmailMoney(item.line_total, item.currency || input.currency)}`;
    }) ?? [];

  const text = [
    `Bestelling: ${input.orderNumber}`,
    `Klant: ${input.customerName}`,
    `Telefoon: ${input.customerPhone}`,
    ...(input.customerEmail ? [`E-mail: ${input.customerEmail}`] : []),
    `Bezorging: ${adminShippingLine(input) || input.shippingCity}`,
    `Totaal: ${formatEmailMoney(input.total, input.currency)}`,
    ...(plainItems.length ? ["", "Producten:", ...plainItems] : []),
    "",
    `Open admin: ${adminUrl}`,
  ].join("\n");

  const inner = [
    buildAdminNewOrderInner(input, ["Je hebt een nieuwe bestelling in de webshop ontvangen."]),
    emailButton(adminUrl, "Bestellingen in admin"),
  ].join("");

  const html = wrapTransactionalEmailHtml({
    preheader: subject,
    title: "Nieuwe bestelling",
    innerHtml: inner,
    siteUrl: shop,
    logoUrl: logoUrlFromOpts(logoUrl),
  });

  return { subject, text, html };
}

/** For SMTP test script — same layout as production admin mail, optional subject prefix. */
export function buildAdminNewOrderTestEmailParts(
  input: AdminNewOrderEmailInput,
  subjectPrefix: string,
  logoUrl?: string,
): { subject: string; text: string; html: string } {
  const shop = transactionalEmailSiteUrl();
  const adminUrl = `${shop}/admin/orders`;
  const subject = `${subjectPrefix}Nieuwe bestelling ${input.orderNumber}`;
  const text = [
    "Dit is een test-e-mail (SMTP).",
    "",
    `Bestelling: ${input.orderNumber}`,
    `Klant: ${input.customerName}`,
    `Telefoon: ${input.customerPhone}`,
    `Totaal: ${formatEmailMoney(input.total, input.currency)}`,
    "",
    `Open admin: ${adminUrl}`,
  ].join("\n");

  const inner = [
    buildAdminNewOrderInner(input, [
      "Dit is een test-e-mail (SMTP).",
      "Je hebt een nieuwe bestelling in de webshop ontvangen.",
    ]),
    emailButton(adminUrl, "Bestellingen in admin"),
  ].join("");

  const html = wrapTransactionalEmailHtml({
    preheader: subject,
    title: "Nieuwe bestelling (test)",
    innerHtml: inner,
    siteUrl: shop,
    logoUrl: logoUrlFromOpts(logoUrl),
  });

  return { subject, text, html };
}
