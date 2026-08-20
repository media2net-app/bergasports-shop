/** Shared HTML shell for all outbound mail (no "server-only" — safe for preview pages). */

import type { OrderItemRow } from "@/lib/orders";
import { SITE_BRAND_NAME, SITE_EMAIL, SITE_SLOGAN } from "@/lib/site-brand";
import { LEGAL_PAGE_PATHS, SITE_ADDRESS } from "@/lib/site-content";
import { SHOP_PHONE_LABEL } from "@/lib/site-contact";

/** Bergasports brand tokens — aligned with `globals.css` / topbar. */
export const TRANSACTIONAL_EMAIL_BRAND = {
  gold: "#b38518",
  goldMid: "#d4af38",
  goldHover: "#9c7b22",
  goldDeep: "#6b5218",
  header: "#1a1a1a",
  headerFg: "#f5f4f2",
  headerMuted: "rgba(245,244,242,0.72)",
  surface: "#faf8f5",
  card: "#ffffff",
  border: "#e5dcc8",
  accentBg: "#f5f0e6",
  text: "#1a1524",
  muted: "#6b6356",
  buttonText: "#1a1a1a",
  /** @deprecated use `gold` — kept for older imports */
  plum: "#b38518",
  /** @deprecated use `goldMid` */
  plumMid: "#d4af38",
} as const;

export type EmailLayoutLocale = "nl" | "en";
export type EmailLayoutVariant = "transactional" | "marketing";

type FooterCopy = {
  tagline: string;
  delivery: string;
  questions: string;
  unsubscribeLead: string;
  unsubscribeAction: string;
  privacy: string;
  mailtoSubject: string;
};

const FOOTER_COPY: Record<EmailLayoutLocale, FooterCopy> = {
  nl: {
    tagline: SITE_SLOGAN,
    delivery: "Levering in Nederland en België",
    questions: "Vragen? Antwoord op deze e-mail of neem contact op via de website.",
    unsubscribeLead: "Geen marketingmails meer ontvangen?",
    unsubscribeAction: "Uitschrijven",
    privacy: "Privacybeleid",
    mailtoSubject: "Uitschrijven nieuwsbrief",
  },
  en: {
    tagline: "Your sports partner",
    delivery: "Delivery in the Netherlands and Belgium",
    questions: "Questions? Reply to this email or contact us via the website.",
    unsubscribeLead: "Prefer not to receive marketing emails?",
    unsubscribeAction: "Unsubscribe",
    privacy: "Privacy policy",
    mailtoSubject: "Unsubscribe newsletter",
  },
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function transactionalEmailSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergasports.com").replace(/\/$/, "");
}

export function formatEmailMoney(amount: number, currency: string): string {
  const value = Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
  const label = currency === "Lei" ? "RON" : currency;
  return `${value} ${label}`;
}

function normalizeLocale(locale?: string | null): EmailLayoutLocale {
  return locale?.trim().toLowerCase().startsWith("en") ? "en" : "nl";
}

function emailHeaderInner(
  siteUrl: string,
  logoUrl: string | undefined,
  locale: EmailLayoutLocale,
): string {
  const shop = escapeHtml(siteUrl);
  const B = TRANSACTIONAL_EMAIL_BRAND;
  if (logoUrl?.trim()) {
    return `<a href="${shop}" style="text-decoration:none;display:inline-block;">
        <img src="${escapeHtml(logoUrl.trim())}" width="220" alt="${escapeHtml(SITE_BRAND_NAME)}" style="display:block;margin:0 auto;max-width:220px;width:100%;height:auto;border:0;" />
      </a>`;
  }

  return `<a href="${shop}" style="text-decoration:none;color:${B.headerFg};display:inline-block;">
        <div style="font-family:Ubuntu,'Helvetica Neue',Arial,sans-serif;font-size:24px;font-weight:700;line-height:1.2;letter-spacing:0.02em;">
          ${escapeHtml(SITE_BRAND_NAME)}
        </div>
        <div style="margin-top:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;font-weight:500;color:${B.goldMid};">
          ${escapeHtml(FOOTER_COPY[locale].tagline)}
        </div>
      </a>`;
}

function emailFooterHtml(params: {
  siteUrl: string;
  locale: EmailLayoutLocale;
  variant: EmailLayoutVariant;
  unsubscribeUrl?: string;
}): string {
  const { siteUrl, locale, variant, unsubscribeUrl } = params;
  const B = TRANSACTIONAL_EMAIL_BRAND;
  const copy = FOOTER_COPY[locale];
  const privacyUrl = `${siteUrl}${LEGAL_PAGE_PATHS.privacy}`;
  const contactUrl = `${siteUrl}/contact`;
  const unsub =
    unsubscribeUrl?.trim() ||
    (variant === "marketing"
      ? `mailto:${SITE_EMAIL}?subject=${encodeURIComponent(copy.mailtoSubject)}`
      : "");

  const marketingBlock =
    variant === "marketing"
      ? `<p style="margin:14px 0 0;font-size:11px;line-height:1.5;color:${B.muted};">
          ${escapeHtml(copy.unsubscribeLead)}
          ${
            unsub
              ? ` <a href="${escapeHtml(unsub)}" style="color:${B.gold};text-decoration:underline;">${escapeHtml(copy.unsubscribeAction)}</a> ·`
              : ""
          }
          <a href="${escapeHtml(privacyUrl)}" style="color:${B.gold};text-decoration:underline;">${escapeHtml(copy.privacy)}</a>
        </p>`
      : "";

  return `
          <tr>
            <td style="padding:0;background:${B.accentBg};">
              <div style="height:3px;line-height:3px;font-size:0;background:linear-gradient(90deg,${B.gold},${B.goldMid},${B.gold});">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px 26px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;line-height:1.55;color:${B.muted};background:${B.accentBg};text-align:center;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${B.text};letter-spacing:0.02em;">${escapeHtml(SITE_BRAND_NAME)}</p>
              <p style="margin:0 0 12px;font-size:11px;color:${B.goldDeep};text-transform:uppercase;letter-spacing:0.12em;">${escapeHtml(copy.tagline)}</p>
              <p style="margin:0 0 4px;">${escapeHtml(SITE_ADDRESS)}</p>
              <p style="margin:0 0 4px;">
                <a href="tel:${escapeHtml(SHOP_PHONE_LABEL.replace(/\D/g, ""))}" style="color:${B.muted};text-decoration:none;">${escapeHtml(SHOP_PHONE_LABEL)}</a>
                &nbsp;·&nbsp;
                <a href="mailto:${escapeHtml(SITE_EMAIL)}" style="color:${B.gold};text-decoration:none;">${escapeHtml(SITE_EMAIL)}</a>
              </p>
              <p style="margin:10px 0 0;">
                <a href="${escapeHtml(siteUrl)}" style="color:${B.gold};text-decoration:none;font-weight:600;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}</a>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(contactUrl)}" style="color:${B.muted};text-decoration:underline;">Contact</a>
              </p>
              <p style="margin:12px 0 0;">${escapeHtml(copy.delivery)}</p>
              <p style="margin:6px 0 0;">${escapeHtml(copy.questions)}</p>
              ${marketingBlock}
            </td>
          </tr>`;
}

export type WrapTransactionalEmailParams = {
  preheader?: string;
  title: string;
  innerHtml: string;
  siteUrl: string;
  /** Optional image in header. Env / site setting: NEXT_PUBLIC_EMAIL_LOGO_URL */
  logoUrl?: string;
  /** Footer / html lang — default NL */
  locale?: EmailLayoutLocale | string | null;
  /** Marketing mails get unsubscribe + privacy in the footer */
  variant?: EmailLayoutVariant;
  /** Explicit unsubscribe URL (mailto or https). Marketing default: mailto shop. */
  unsubscribeUrl?: string;
  /** When false, omit the H1 (body already has its own heading). Default true. */
  showTitle?: boolean;
};

export function wrapTransactionalEmailHtml(params: WrapTransactionalEmailParams): string {
  const {
    preheader,
    title,
    innerHtml,
    siteUrl,
    logoUrl,
    unsubscribeUrl,
    showTitle = true,
  } = params;
  const locale = normalizeLocale(params.locale);
  const variant = params.variant ?? "transactional";
  const B = TRANSACTIONAL_EMAIL_BRAND;

  const pre = preheader?.trim()
    ? `<div style="display:none;font-size:1px;color:${B.surface};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader.trim())}</div>`
    : "";

  const headerInner = emailHeaderInner(siteUrl, logoUrl, locale);
  const titleBlock = showTitle
    ? `<h1 style="margin:0 0 18px;font-family:Ubuntu,'Helvetica Neue',Arial,sans-serif;font-size:22px;line-height:1.3;font-weight:700;color:${B.text};">
                ${escapeHtml(title)}
              </h1>
              <div style="width:48px;height:3px;margin:0 0 20px;background:${B.goldMid};border-radius:2px;font-size:0;line-height:0;">&nbsp;</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${B.surface};-webkit-text-size-adjust:100%;">
  ${pre}
  <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="background:${B.surface};">
    <tr>
      <td align="center" style="padding:32px 16px 48px;">
        <table role="presentation" width="600" cellPadding="0" cellSpacing="0" style="max-width:600px;width:100%;background:${B.card};border-radius:16px;overflow:hidden;border:1px solid ${B.border};box-shadow:0 8px 28px -18px rgba(26,21,36,0.28);">
          <tr>
            <td style="background:${B.header};padding:28px 28px 24px;text-align:center;">
              ${headerInner}
            </td>
          </tr>
          <tr>
            <td style="padding:0;line-height:0;font-size:0;background:${B.goldMid};height:4px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 28px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${B.text};">
              ${titleBlock}
              <div style="font-size:15px;line-height:1.6;color:${B.text};">
                ${innerHtml}
              </div>
            </td>
          </tr>
          ${emailFooterHtml({ siteUrl, locale, variant, unsubscribeUrl })}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text footer lines matching the HTML shell. */
export function transactionalEmailTextFooter(
  siteUrl: string,
  locale?: EmailLayoutLocale | string | null,
  variant: EmailLayoutVariant = "transactional",
): string {
  const loc = normalizeLocale(locale);
  const copy = FOOTER_COPY[loc];
  const lines = [
    "—",
    SITE_BRAND_NAME,
    SITE_ADDRESS,
    `${SHOP_PHONE_LABEL} · ${SITE_EMAIL}`,
    siteUrl,
    copy.delivery,
    copy.questions,
  ];
  if (variant === "marketing") {
    lines.push(`${copy.unsubscribeLead} ${copy.unsubscribeAction}: mailto:${SITE_EMAIL}`);
  }
  return lines.join("\n");
}

export function emailButton(href: string, label: string): string {
  const h = escapeHtml(href);
  const l = escapeHtml(label);
  const B = TRANSACTIONAL_EMAIL_BRAND;
  return `
  <table role="presentation" cellPadding="0" cellSpacing="0" style="margin:22px 0;">
    <tr>
      <td style="border-radius:999px;background:${B.goldMid};">
        <a href="${h}" style="display:inline-block;padding:13px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${B.buttonText};text-decoration:none;border-radius:999px;">
          ${l}
        </a>
      </td>
    </tr>
  </table>`;
}

export function emailDetailTable(rows: { label: string; value: string }[]): string {
  const B = TRANSACTIONAL_EMAIL_BRAND;
  const inner = rows
    .map(
      (r) => `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:${B.muted};width:130px;vertical-align:top;">${escapeHtml(r.label)}</td>
      <td style="padding:8px 0;font-size:14px;color:${B.text};font-weight:600;vertical-align:top;">${escapeHtml(r.value)}</td>
    </tr>`,
    )
    .join("");
  return `
  <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="margin:16px 0;border-collapse:collapse;">
    ${inner}
  </table>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 14px;">${escapeHtml(text)}</p>`;
}

export function emailInfoBox(title: string, rows: { label: string; value: string }[]): string {
  const B = TRANSACTIONAL_EMAIL_BRAND;
  return `
  <div style="margin:18px 0;padding:16px 18px;background:${B.accentBg};border-radius:10px;border:1px solid ${B.border};">
    <p style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${B.gold};">${escapeHtml(title)}</p>
    ${emailDetailTable(rows)}
  </div>`;
}

function productImageCell(imageUrl: string | null | undefined, name: string): string {
  const B = TRANSACTIONAL_EMAIL_BRAND;
  const alt = escapeHtml(name);
  const url = imageUrl?.trim();
  if (url && /^https?:\/\//i.test(url)) {
    return `
      <td width="72" style="width:72px;padding:12px 10px 12px 14px;vertical-align:top;">
        <img src="${escapeHtml(url)}" width="64" height="64" alt="${alt}" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid ${B.border};background:${B.accentBg};" />
      </td>`;
  }
  return `
      <td width="72" style="width:72px;padding:12px 10px 12px 14px;vertical-align:top;">
        <div style="width:64px;height:64px;border-radius:8px;background:${B.accentBg};border:1px solid ${B.border};font-size:10px;line-height:64px;text-align:center;color:${B.muted};">Foto</div>
      </td>`;
}

/** Product rows with thumbnail, unit price and line total. */
export function emailOrderItemsBlock(
  items: OrderItemRow[],
  totals: { subtotal: number; discountTotal: number; total: number; currency: string },
): string {
  if (!items.length) {
    return "";
  }

  const B = TRANSACTIONAL_EMAIL_BRAND;

  const rows = items
    .map((item) => {
      const variation = item.variation_label ? ` · ${item.variation_label}` : "";
      const name = `${item.name}${variation}`;
      const qty = item.quantity;
      const unit = formatEmailMoney(item.unit_price, item.currency || totals.currency);
      const line = formatEmailMoney(item.line_total, item.currency || totals.currency);
      return `
      <tr>
        ${productImageCell(item.image, item.name)}
        <td style="padding:12px 8px 12px 0;vertical-align:top;font-size:14px;line-height:1.45;color:${B.text};">
          <div style="font-weight:600;margin-bottom:6px;">${escapeHtml(name)}</div>
          <div style="font-size:13px;color:${B.muted};">Aantal: <strong style="color:${B.text};">${qty}</strong></div>
          <div style="font-size:13px;color:${B.muted};margin-top:4px;">Stukprijs: <strong style="color:${B.text};">${escapeHtml(unit)}</strong></div>
        </td>
        <td style="padding:12px 14px 12px 4px;vertical-align:top;text-align:right;white-space:nowrap;font-size:14px;font-weight:700;color:${B.text};">
          ${escapeHtml(line)}
        </td>
      </tr>
      <tr><td colspan="3" style="border-bottom:1px solid ${B.border};"></td></tr>`;
    })
    .join("");

  const discountRow =
    totals.discountTotal > 0.005
      ? `
      <tr>
        <td colspan="2" style="padding:10px 8px 6px 0;text-align:right;font-size:14px;color:${B.muted};">Korting</td>
        <td style="padding:10px 0 6px;text-align:right;font-size:14px;font-weight:600;color:#b42318;">−${escapeHtml(formatEmailMoney(totals.discountTotal, totals.currency))}</td>
      </tr>`
      : "";

  return `
  <p style="margin:20px 0 10px;font-weight:700;font-size:14px;color:${B.text};">Bestelde producten</p>
  <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="margin:0 0 8px;border-collapse:collapse;">
    ${rows}
    <tr>
      <td colspan="2" style="padding:10px 8px 6px 0;text-align:right;font-size:14px;color:${B.muted};">Subtotaal</td>
      <td style="padding:10px 0 6px;text-align:right;font-size:14px;font-weight:600;color:${B.text};">${escapeHtml(formatEmailMoney(totals.subtotal, totals.currency))}</td>
    </tr>
    ${discountRow}
    <tr>
      <td colspan="2" style="padding:8px 8px 4px 0;text-align:right;font-size:15px;font-weight:700;color:${B.text};">Totaal te betalen</td>
      <td style="padding:8px 0 4px;text-align:right;font-size:16px;font-weight:700;color:${B.gold};">${escapeHtml(formatEmailMoney(totals.total, totals.currency))}</td>
    </tr>
  </table>`;
}

/** @deprecated Use emailOrderItemsBlock — plain list for plain-text only */
export function emailProductList(lines: string[]): string {
  if (!lines.length) {
    return "";
  }
  const B = TRANSACTIONAL_EMAIL_BRAND;
  const items = lines
    .map((line) => `<li style="margin:0 0 6px;">${escapeHtml(line)}</li>`)
    .join("");
  return `
  <p style="margin:0 0 8px;font-weight:600;font-size:14px;">Producten</p>
  <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.45;color:${B.text};">${items}</ul>`;
}
