export type EmailTemplateCategory = "order" | "admin" | "marketing";

export type EmailTemplateKey =
  | "order.received"
  | "order.confirmed"
  | "order.shipped"
  | "order.delivered"
  | "order.cancelled"
  | "order.admin_new"
  | "marketing.welcome"
  | "marketing.post_purchase"
  | "marketing.win_back";

import type { EmailLocaleFields, LocaleMap } from "@/lib/i18n/translations";

export type EmailTemplateDraft = {
  key: EmailTemplateKey;
  category: EmailTemplateCategory;
  name: string;
  description: string;
  subject: string;
  title: string;
  bodyHtml: string;
  translations?: LocaleMap<EmailLocaleFields>;
};

export type EmailPlaceholder = {
  token: string;
  label: string;
  hint: string;
  block?: boolean;
};

export const EMAIL_PLACEHOLDERS: EmailPlaceholder[] = [
  { token: "customer_name", label: "Klantnaam", hint: "Voor- en achternaam" },
  { token: "order_number", label: "Bestelnummer", hint: "Bijv. BS-1042" },
  { token: "order_date", label: "Besteldatum", hint: "Datum en tijd" },
  { token: "customer_email", label: "E-mail klant", hint: "" },
  { token: "customer_phone", label: "Telefoon", hint: "" },
  { token: "shipping_address", label: "Bezorgadres", hint: "" },
  { token: "payment_method", label: "Betaling", hint: "iDEAL, rembours, …" },
  { token: "notes", label: "Opmerkingen", hint: "Bestelnotitie" },
  { token: "total", label: "Totaal", hint: "Inclusief valuta" },
  { token: "subtotal", label: "Subtotaal", hint: "" },
  { token: "discount", label: "Korting", hint: "" },
  { token: "tracking_code", label: "Trackingcode", hint: "" },
  { token: "tracking_url", label: "Trackinglink", hint: "" },
  { token: "tracking_line", label: "Trackingtekst", hint: "Zin over zending of bezorger" },
  { token: "shop_url", label: "Shop-URL", hint: "" },
  { token: "returns_url", label: "Retour-URL", hint: "" },
  { token: "admin_orders_url", label: "Admin-URL", hint: "Bestellingen in admin" },
  { token: "winback_code", label: "Win-backcode", hint: "Kortingscode" },
  { token: "winback_expiry", label: "Win-back geldig tot", hint: "" },
  { token: "order_summary", label: "Bestelgegevens", hint: "Blok met nummer, adres, betaling", block: true },
  { token: "order_items", label: "Producten", hint: "Tabel met regels en totaal", block: true },
  { token: "button_shop", label: "Knop webshop", hint: "Gouden knop naar /shop", block: true },
  { token: "button_returns", label: "Knop retour", hint: "Knop naar retourbeleid", block: true },
  { token: "button_track", label: "Knop track & trace", hint: "Alleen als er een trackinglink is", block: true },
  { token: "button_admin", label: "Knop admin", hint: "Bestellingen openen", block: true },
];

export const EMAIL_TEMPLATE_KEYS: EmailTemplateKey[] = [
  "order.received",
  "order.confirmed",
  "order.shipped",
  "order.delivered",
  "order.cancelled",
  "order.admin_new",
  "marketing.welcome",
  "marketing.post_purchase",
  "marketing.win_back",
];

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateKey, EmailTemplateDraft> = {
  "order.received": {
    key: "order.received",
    category: "order",
    name: "Bestelling ontvangen",
    description: "Na het plaatsen van de order, vóór verzending.",
    subject: "Bestelling {{order_number}} ontvangen",
    title: "Je bestelling is ontvangen",
    bodyHtml: [
      "<p>Hallo {{customer_name}},</p>",
      "<p>Bedankt voor je bestelling! We hebben je order geregistreerd en verwerken deze zo snel mogelijk.</p>",
      "<p>Je betaalt rembours bij aflevering van het pakket.</p>",
      "{{order_summary}}",
      "{{order_items}}",
      "{{button_shop}}",
    ].join("\n"),
  },
  "order.confirmed": {
    key: "order.confirmed",
    category: "order",
    name: "Bestelling bevestigd",
    description: "Zodra de bestelling is bevestigd en klaarstaat voor verzending.",
    subject: "Bestelling {{order_number}} bevestigd",
    title: "Bestelling bevestigd",
    bodyHtml: [
      "<p>Hallo {{customer_name}},</p>",
      "<p>Je bestelling is bevestigd en wordt klaargemaakt voor verzending.</p>",
      "<p>We laten het weten zodra het pakket onderweg is.</p>",
      "{{order_summary}}",
      "{{order_items}}",
    ].join("\n"),
  },
  "order.shipped": {
    key: "order.shipped",
    category: "order",
    name: "Bestelling verzonden",
    description: "Als de zending is aangemaakt of op verzonden is gezet.",
    subject: "Bestelling {{order_number}} verzonden",
    title: "Bestelling verzonden",
    bodyHtml: [
      "<p>Hallo {{customer_name}},</p>",
      "<p>Goed nieuws — je pakket is onderweg.</p>",
      "<p>{{tracking_line}}</p>",
      "{{button_track}}",
      "{{order_summary}}",
      "{{order_items}}",
    ].join("\n"),
  },
  "order.delivered": {
    key: "order.delivered",
    category: "order",
    name: "Bestelling geleverd",
    description: "Na aflevering, met link naar retourneren.",
    subject: "Bestelling {{order_number}} geleverd",
    title: "Bestelling geleverd",
    bodyHtml: [
      "<p>Hallo {{customer_name}},</p>",
      "<p>Je bestelling is geleverd. We hopen dat je tevreden bent!</p>",
      "<p>Voor retour (14 dagen) kun je ons retourbeleid op de website bekijken.</p>",
      "{{order_summary}}",
      "{{order_items}}",
      "{{button_returns}}",
      "{{button_shop}}",
    ].join("\n"),
  },
  "order.cancelled": {
    key: "order.cancelled",
    category: "order",
    name: "Bestelling geannuleerd",
    description: "Als een order wordt geannuleerd.",
    subject: "Bestelling {{order_number}} geannuleerd",
    title: "Bestelling geannuleerd",
    bodyHtml: [
      "<p>Hallo {{customer_name}},</p>",
      "<p>Je bestelling is geannuleerd.</p>",
      "<p>Heb je de annulering niet aangevraagd of heb je vragen? Neem zo snel mogelijk contact met ons op.</p>",
      "{{order_summary}}",
      "{{order_items}}",
    ].join("\n"),
  },
  "order.admin_new": {
    key: "order.admin_new",
    category: "admin",
    name: "Nieuwe bestelling (intern)",
    description: "Interne melding naar het winkeladres bij een nieuwe order.",
    subject: "Nieuwe bestelling {{order_number}}",
    title: "Nieuwe bestelling",
    bodyHtml: [
      "<p>Je hebt een nieuwe bestelling in de webshop ontvangen.</p>",
      "{{order_summary}}",
      "{{order_items}}",
      "{{button_admin}}",
    ].join("\n"),
  },
  "marketing.welcome": {
    key: "marketing.welcome",
    category: "marketing",
    name: "Welkomstmail",
    description: "Na de eerste bestelling met marketingtoestemming.",
    subject: "Welkom bij Bergasports",
    title: "Welkom!",
    bodyHtml: [
      "<p>Hallo {{customer_name}},</p>",
      "<p>Bedankt voor je aanmelding! Je ontvangt geselecteerde aanbiedingen, kortingen en nieuws over ons assortiment.</p>",
      "<p>Onze belofte: nuttige berichten in het Nederlands, zonder spam.</p>",
      "{{button_shop}}",
    ].join("\n"),
  },
  "marketing.post_purchase": {
    key: "marketing.post_purchase",
    category: "marketing",
    name: "Na levering",
    description: "Bedankmail na een geleverde bestelling.",
    subject: "Bedankt voor bestelling {{order_number}}",
    title: "Bedankt voor je vertrouwen",
    bodyHtml: [
      "<p>Hallo {{customer_name}},</p>",
      "<p>Je bestelling is geleverd — we hopen dat je er blij mee bent!</p>",
      "<p>Vragen over maat, onderhoud of retour (14 dagen)? Antwoord op deze e-mail of neem contact op via de website.</p>",
      "<p>Bestelling {{order_number}} · {{total}}</p>",
      "{{button_returns}}",
      "{{button_shop}}",
    ].join("\n"),
  },
  "marketing.win_back": {
    key: "marketing.win_back",
    category: "marketing",
    name: "Win-back",
    description: "Korting voor klanten die een tijd niet besteld hebben.",
    subject: "We missen je — {{winback_code}}",
    title: "Tot snel?",
    bodyHtml: [
      "<p>Hallo {{customer_name}},</p>",
      "<p>Het is even geleden — we hebben een korting voor je klaargezet.</p>",
      "<p>Code: {{winback_code}} · geldig tot {{winback_expiry}}</p>",
      "{{button_shop}}",
    ].join("\n"),
  },
};

export const EMAIL_TEMPLATE_CATEGORY_LABEL: Record<EmailTemplateCategory, string> = {
  order: "Bestellingen",
  admin: "Intern",
  marketing: "Marketing",
};

export function isEmailTemplateKey(value: string): value is EmailTemplateKey {
  return EMAIL_TEMPLATE_KEYS.includes(value as EmailTemplateKey);
}

export function tokenMarkup(token: string): string {
  return `{{${token}}}`;
}
