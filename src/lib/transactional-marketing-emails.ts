import type { OrderWithItems } from "@/lib/orders";
import { resolveSiteEmailLogoUrl } from "@/lib/site-brand";
import { LEGAL_PAGE_PATHS } from "@/lib/site-content";
import {
  emailButton,
  emailParagraph,
  formatEmailMoney,
  transactionalEmailSiteUrl,
  wrapTransactionalEmailHtml,
} from "@/lib/transactional-email-layout";

export type MarketingEmailKind = "welcome" | "post_purchase" | "win_back";

export type MarketingEmailBrandOpts = {
  logoUrl?: string;
  winBackCode?: string;
  winBackExpiryDays?: number;
};

function expiryDateNl(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(d);
}

function logoUrlFromOpts(opts?: MarketingEmailBrandOpts): string {
  return opts?.logoUrl?.trim() || resolveSiteEmailLogoUrl();
}

export function buildWelcomeEmailParts(
  customerName: string,
  opts?: MarketingEmailBrandOpts,
): { subject: string; text: string; html: string } {
  const shop = transactionalEmailSiteUrl();
  const subject = "Welkom bij Bergasports";
  const text = [
    `Hallo ${customerName},`,
    "",
    "Bedankt voor je aanmelding! Je ontvangt geselecteerde aanbiedingen, kortingen en nieuws — zonder spam.",
    "",
    `Bekijk de webshop: ${shop}/shop`,
    "",
    "Je kunt je altijd afmelden door op deze e-mail te antwoorden.",
  ].join("\n");

  const inner = [
    emailParagraph(`Hallo ${customerName},`),
    emailParagraph(
      "Bedankt voor je aanmelding! Je ontvangt geselecteerde aanbiedingen, kortingen en nieuws over ons assortiment.",
    ),
    emailParagraph("Onze belofte: nuttige berichten in het Nederlands, zonder spam."),
    emailButton(`${shop}/shop`, "Naar de webshop"),
  ].join("");

  const html = wrapTransactionalEmailHtml({
    preheader: subject,
    title: "Welkom!",
    innerHtml: inner,
    siteUrl: shop,
    logoUrl: logoUrlFromOpts(opts),
  });

  return { subject, text, html };
}

export function buildPostPurchaseEmailParts(
  order: OrderWithItems,
  opts?: MarketingEmailBrandOpts,
): { subject: string; text: string; html: string } {
  const shop = transactionalEmailSiteUrl();
  const subject = `Bedankt voor bestelling ${order.order_number}`;
  const text = [
    `Hallo ${order.customer_name},`,
    "",
    "We hopen dat je blij bent met je aankoop! Hulp nodig met maat of retour (14 dagen)? We helpen je graag.",
    "",
    `Bestelling: ${order.order_number}`,
    `Totaal: ${formatEmailMoney(order.total, order.currency)}`,
    "",
    `Retourbeleid: ${shop}${LEGAL_PAGE_PATHS.returns}`,
    `Opnieuw bestellen: ${shop}/shop`,
  ].join("\n");

  const inner = [
    emailParagraph(`Hallo ${order.customer_name},`),
    emailParagraph("Je bestelling is geleverd — we hopen dat je er blij mee bent!"),
    emailParagraph(
      "Vragen over maat, onderhoud of retour (14 dagen)? Antwoord op deze e-mail of neem contact op via de website.",
    ),
    emailParagraph(`Bestelling ${order.order_number} · ${formatEmailMoney(order.total, order.currency)}`),
    emailButton(`${shop}${LEGAL_PAGE_PATHS.returns}`, "Retourneren"),
    emailButton(`${shop}/shop`, "Opnieuw bestellen"),
  ].join("");

  const html = wrapTransactionalEmailHtml({
    preheader: subject,
    title: "Bedankt voor je vertrouwen",
    innerHtml: inner,
    siteUrl: shop,
    logoUrl: logoUrlFromOpts(opts),
  });

  return { subject, text, html };
}

export function buildWinBackEmailParts(
  customerName: string,
  opts?: MarketingEmailBrandOpts,
): { subject: string; text: string; html: string } {
  const shop = transactionalEmailSiteUrl();
  const code = opts?.winBackCode?.trim() || process.env.MARKETING_WINBACK_CODE?.trim() || "TERUG10";
  const expiryDaysRaw =
    opts?.winBackExpiryDays ?? Number(process.env.MARKETING_WINBACK_EXPIRY_DAYS?.trim() || "14");
  const expiryDays = Number.isFinite(expiryDaysRaw) && expiryDaysRaw > 0 ? expiryDaysRaw : 14;
  const expiry = expiryDateNl(expiryDays);
  const subject = `We missen je — ${code}`;
  const text = [
    `Hallo ${customerName},`,
    "",
    `We zien je graag terug in de webshop. Gebruik code ${code} bij je volgende bestelling.`,
    `Geldig tot ${expiry}.`,
    "",
    `${shop}/shop`,
  ].join("\n");

  const inner = [
    emailParagraph(`Hallo ${customerName},`),
    emailParagraph("Het is even geleden — we hebben een korting voor je klaargezet."),
    emailParagraph(`Code: ${code} · geldig tot ${expiry}`),
    emailButton(`${shop}/shop`, "Bekijk aanbiedingen"),
  ].join("");

  const html = wrapTransactionalEmailHtml({
    preheader: subject,
    title: "Tot snel?",
    innerHtml: inner,
    siteUrl: shop,
    logoUrl: logoUrlFromOpts(opts),
  });

  return { subject, text, html };
}
