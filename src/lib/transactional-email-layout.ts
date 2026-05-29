/** Shared HTML shell for transactional mail (no "server-only" — safe for preview pages). */

import type { OrderItemRow } from "@/lib/orders";

export const TRANSACTIONAL_EMAIL_BRAND = {
  plum: "#B38F27",
  plumMid: "#96741f",
  surface: "#faf8f5",
  card: "#ffffff",
  border: "#e5dcc8",
  muted: "#5c4a6e",
  accentBg: "#f5f0e6",
} as const;

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

function emailHeaderInner(siteUrl: string, logoUrl: string | undefined): string {
  const shop = escapeHtml(siteUrl);
  if (logoUrl?.trim()) {
    return `<a href="${shop}" style="text-decoration:none;display:inline-block;">
        <img src="${escapeHtml(logoUrl.trim())}" width="280" height="27" alt="Bergasports" style="display:block;margin:0 auto;max-width:280px;width:100%;height:auto;border:0;" />
      </a>`;
  }

  return `<a href="${shop}" style="text-decoration:none;color:#ffffff;display:inline-block;">
        <div style="font-family:Ubuntu,'Helvetica Neue',Arial,sans-serif;font-size:26px;font-weight:700;line-height:1.2;letter-spacing:-0.02em;">
          Bergasports
        </div>
        <div style="margin-top:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;font-weight:500;opacity:0.92;">
          Premium wielersport online
        </div>
      </a>`;
}

export type WrapTransactionalEmailParams = {
  preheader?: string;
  title: string;
  innerHtml: string;
  siteUrl: string;
  /** Optional image above text logo in header. Env: NEXT_PUBLIC_EMAIL_LOGO_URL */
  logoUrl?: string;
};

export function wrapTransactionalEmailHtml(params: WrapTransactionalEmailParams): string {
  const { preheader, title, innerHtml, siteUrl, logoUrl } = params;
  const pre = preheader?.trim()
    ? `<div style="display:none;font-size:1px;color:#faf8f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader.trim())}</div>`
    : "";

  const headerInner = emailHeaderInner(siteUrl, logoUrl);

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${TRANSACTIONAL_EMAIL_BRAND.surface};-webkit-text-size-adjust:100%;">
  ${pre}
  <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="background:${TRANSACTIONAL_EMAIL_BRAND.surface};">
    <tr>
      <td align="center" style="padding:28px 16px 40px;">
        <table role="presentation" width="600" cellPadding="0" cellSpacing="0" style="max-width:600px;width:100%;background:${TRANSACTIONAL_EMAIL_BRAND.card};border-radius:14px;overflow:hidden;border:1px solid ${TRANSACTIONAL_EMAIL_BRAND.border};">
          <tr>
            <td style="background:${TRANSACTIONAL_EMAIL_BRAND.plum};padding:24px 28px 22px;text-align:center;">
              ${headerInner}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${TRANSACTIONAL_EMAIL_BRAND.plum};">
              <h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;font-weight:700;color:${TRANSACTIONAL_EMAIL_BRAND.plum};">
                ${escapeHtml(title)}
              </h1>
              <div style="font-size:15px;line-height:1.55;color:${TRANSACTIONAL_EMAIL_BRAND.plum};">
                ${innerHtml}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;line-height:1.5;color:${TRANSACTIONAL_EMAIL_BRAND.muted};border-top:1px solid ${TRANSACTIONAL_EMAIL_BRAND.border};">
              <p style="margin:16px 0 8px;">Bergasports · <a href="${escapeHtml(siteUrl)}" style="color:${TRANSACTIONAL_EMAIL_BRAND.plumMid};">${escapeHtml(siteUrl)}</a></p>
              <p style="margin:0 0 6px;">Levering in Nederland en België · Rembours bij aflevering</p>
              <p style="margin:0;">Vragen? Antwoord op deze e-mail of neem contact op via de website.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailButton(href: string, label: string): string {
  const h = escapeHtml(href);
  const l = escapeHtml(label);
  return `
  <table role="presentation" cellPadding="0" cellSpacing="0" style="margin:20px 0;">
    <tr>
      <td style="border-radius:999px;background:${TRANSACTIONAL_EMAIL_BRAND.plum};">
        <a href="${h}" style="display:inline-block;padding:12px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">
          ${l}
        </a>
      </td>
    </tr>
  </table>`;
}

export function emailDetailTable(rows: { label: string; value: string }[]): string {
  const inner = rows
    .map(
      (r) => `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:${TRANSACTIONAL_EMAIL_BRAND.muted};width:130px;vertical-align:top;">${escapeHtml(r.label)}</td>
      <td style="padding:8px 0;font-size:14px;color:${TRANSACTIONAL_EMAIL_BRAND.plum};font-weight:600;vertical-align:top;">${escapeHtml(r.value)}</td>
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
  return `
  <div style="margin:18px 0;padding:16px 18px;background:${TRANSACTIONAL_EMAIL_BRAND.accentBg};border-radius:10px;border:1px solid ${TRANSACTIONAL_EMAIL_BRAND.border};">
    <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:${TRANSACTIONAL_EMAIL_BRAND.plumMid};">${escapeHtml(title)}</p>
    ${emailDetailTable(rows)}
  </div>`;
}

function productImageCell(imageUrl: string | null | undefined, name: string): string {
  const alt = escapeHtml(name);
  const url = imageUrl?.trim();
  if (url && /^https?:\/\//i.test(url)) {
    return `
      <td width="72" style="width:72px;padding:12px 10px 12px 14px;vertical-align:top;">
        <img src="${escapeHtml(url)}" width="64" height="64" alt="${alt}" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid ${TRANSACTIONAL_EMAIL_BRAND.border};background:#f8f5fc;" />
      </td>`;
  }
  return `
      <td width="72" style="width:72px;padding:12px 10px 12px 14px;vertical-align:top;">
        <div style="width:64px;height:64px;border-radius:8px;background:${TRANSACTIONAL_EMAIL_BRAND.accentBg};border:1px solid ${TRANSACTIONAL_EMAIL_BRAND.border};font-size:10px;line-height:64px;text-align:center;color:${TRANSACTIONAL_EMAIL_BRAND.muted};">Foto</div>
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
        <td style="padding:12px 8px 12px 0;vertical-align:top;font-size:14px;line-height:1.45;color:${TRANSACTIONAL_EMAIL_BRAND.plum};">
          <div style="font-weight:600;margin-bottom:6px;">${escapeHtml(name)}</div>
          <div style="font-size:13px;color:${TRANSACTIONAL_EMAIL_BRAND.muted};">Aantal: <strong style="color:${TRANSACTIONAL_EMAIL_BRAND.plum};">${qty}</strong></div>
          <div style="font-size:13px;color:${TRANSACTIONAL_EMAIL_BRAND.muted};margin-top:4px;">Stukprijs: <strong style="color:${TRANSACTIONAL_EMAIL_BRAND.plum};">${escapeHtml(unit)}</strong></div>
        </td>
        <td style="padding:12px 14px 12px 4px;vertical-align:top;text-align:right;white-space:nowrap;font-size:14px;font-weight:700;color:${TRANSACTIONAL_EMAIL_BRAND.plum};">
          ${escapeHtml(line)}
        </td>
      </tr>
      <tr><td colspan="3" style="border-bottom:1px solid ${TRANSACTIONAL_EMAIL_BRAND.border};"></td></tr>`;
    })
    .join("");

  const discountRow =
    totals.discountTotal > 0.005
      ? `
      <tr>
        <td colspan="2" style="padding:10px 8px 6px 0;text-align:right;font-size:14px;color:${TRANSACTIONAL_EMAIL_BRAND.muted};">Korting</td>
        <td style="padding:10px 0 6px;text-align:right;font-size:14px;font-weight:600;color:#b42318;">−${escapeHtml(formatEmailMoney(totals.discountTotal, totals.currency))}</td>
      </tr>`
      : "";

  return `
  <p style="margin:20px 0 10px;font-weight:700;font-size:14px;color:${TRANSACTIONAL_EMAIL_BRAND.plum};">Bestelde producten</p>
  <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="margin:0 0 8px;border-collapse:collapse;">
    ${rows}
    <tr>
      <td colspan="2" style="padding:10px 8px 6px 0;text-align:right;font-size:14px;color:${TRANSACTIONAL_EMAIL_BRAND.muted};">Subtotal</td>
      <td style="padding:10px 0 6px;text-align:right;font-size:14px;font-weight:600;color:${TRANSACTIONAL_EMAIL_BRAND.plum};">${escapeHtml(formatEmailMoney(totals.subtotal, totals.currency))}</td>
    </tr>
    ${discountRow}
    <tr>
      <td colspan="2" style="padding:8px 8px 4px 0;text-align:right;font-size:15px;font-weight:700;color:${TRANSACTIONAL_EMAIL_BRAND.plum};">Totaal te betalen</td>
      <td style="padding:8px 0 4px;text-align:right;font-size:16px;font-weight:700;color:${TRANSACTIONAL_EMAIL_BRAND.plum};">${escapeHtml(formatEmailMoney(totals.total, totals.currency))}</td>
    </tr>
  </table>`;
}

/** @deprecated Use emailOrderItemsBlock — plain list for plain-text only */
export function emailProductList(lines: string[]): string {
  if (!lines.length) {
    return "";
  }
  const items = lines
    .map((line) => `<li style="margin:0 0 6px;">${escapeHtml(line)}</li>`)
    .join("");
  return `
  <p style="margin:0 0 8px;font-weight:600;font-size:14px;">Producten</p>
  <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.45;color:${TRANSACTIONAL_EMAIL_BRAND.plum};">${items}</ul>`;
}
