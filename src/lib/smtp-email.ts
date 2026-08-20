import "server-only";

import fs from "node:fs";
import path from "node:path";

import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import { EMAIL_LOGO_CID, EMAIL_LOGO_CID_SRC, SITE_LOGO_SRC } from "@/lib/site-brand";
import { getRuntimeSetting } from "@/lib/site-settings-db";

export type SmtpEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

export type SmtpSendResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

/**
 * Rewrite the header logo `<img alt="Bergasports">` to a CID and attach
 * `public/bergasports-logo.png`. Email clients cannot load localhost; production
 * www may still be WordPress (logo 404). Absolute https remains OK for browser previews.
 */
function embedBrandLogoForSmtp(html: string | undefined): {
  html?: string;
  attachments?: {
    filename: string;
    path: string;
    cid: string;
    contentDisposition: "inline";
    contentType: string;
  }[];
} {
  if (!html?.trim()) return { html };

  const logoFile = path.join(process.cwd(), "public", SITE_LOGO_SRC.replace(/^\//, ""));
  if (!fs.existsSync(logoFile)) {
    return { html };
  }

  let replaced = false;
  const rewritten = html.replace(/<img\b([^>]*)>/gi, (full, attrs: string) => {
    const isBrandLogo =
      /\balt\s*=\s*(["'])Bergasports\1/i.test(attrs) ||
      /\bsrc\s*=\s*(["'])[^"']*bergasports-logo\.(?:png|svg)\1/i.test(attrs) ||
      /\bsrc\s*=\s*(["'])cid:bergasports-logo\1/i.test(attrs);
    if (!isBrandLogo || !/\bsrc\s*=/i.test(attrs)) return full;
    replaced = true;
    const next = attrs.replace(/\bsrc\s*=\s*(["'])[^"']*\1/i, `src=$1${EMAIL_LOGO_CID_SRC}$1`);
    return `<img${next}>`;
  });

  if (!replaced) {
    return { html };
  }

  return {
    html: rewritten,
    attachments: [
      {
        filename: "bergasports-logo.png",
        path: logoFile,
        cid: EMAIL_LOGO_CID,
        contentDisposition: "inline",
        contentType: "image/png",
      },
    ],
  };
}

/** Strip accidental quotes / CR from pasted secrets (common .env / form paste issue). */
function cleanSecret(raw: string): string {
  let v = raw.trim().replace(/\r/g, "");
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

async function smtpPassword(): Promise<string> {
  // DB / SMTP_PASS env via getRuntimeSetting; SMTP_PASSWORD is a legacy env alias.
  const primary = cleanSecret(await getRuntimeSetting("SMTP_PASS"));
  if (primary) return primary;
  return cleanSecret(process.env.SMTP_PASSWORD ?? "");
}

export async function isSmtpConfigured(): Promise<boolean> {
  const [host, user, pass] = await Promise.all([
    getRuntimeSetting("SMTP_HOST"),
    getRuntimeSetting("SMTP_USER"),
    smtpPassword(),
  ]);
  return Boolean(cleanSecret(host) && cleanSecret(user) && pass);
}

async function smtpFromAddress(): Promise<string> {
  const from = cleanSecret(await getRuntimeSetting("SMTP_FROM"));
  if (from) return from;
  const orderFrom = cleanSecret(await getRuntimeSetting("ORDER_NOTIFICATION_FROM"));
  if (orderFrom) return orderFrom;
  const user = cleanSecret(await getRuntimeSetting("SMTP_USER"));
  return user ? `Bergasports <${user}>` : "Bergasports <info@bergasports.com>";
}

function parseSmtpSecure(secureRaw: string, port: number): boolean {
  const raw = secureRaw.trim().toLowerCase();
  // Known ports win over a stale SMTP_SECURE=true in .env (common misconfig
  // that breaks AUTH/TLS on 587). Explicit false on 465 still allowed.
  if (port === 465) return raw !== "false" && raw !== "0" && raw !== "no";
  if (port === 587 || port === 25 || port === 2525) return false;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  return port === 465;
}

function dutchSmtpError(err: unknown): { error: string; code?: string } {
  const e = err as {
    code?: string;
    command?: string;
    responseCode?: number;
    message?: string;
  };
  const code = typeof e?.code === "string" ? e.code : undefined;
  const msg = typeof e?.message === "string" ? e.message : String(err);

  if (code === "EAUTH" || /535|authentication failed|Invalid login/i.test(msg)) {
    return {
      code: "EAUTH",
      error:
        "SMTP-inloggen mislukt (verkeerde gebruiker of wachtwoord). Controleer onder Admin → Instellingen → Verzenden: SMTP host, gebruiker (meestal het volledige e-mailadres) en SMTP wachtwoord (mailbox- of app-wachtwoord — géén Resend API-key). Poort 465 = SSL, poort 587 = STARTTLS; laat SMTP SSL/TLS leeg voor automatisch.",
    };
  }
  if (code === "ESOCKET" || code === "ECONNECTION" || code === "ETIMEDOUT") {
    return {
      code,
      error:
        "Geen verbinding met de SMTP-server. Controleer SMTP host, poort (465 of 587) en SMTP SSL/TLS.",
    };
  }
  if (code === "EENVELOPE" || /sender|from/i.test(msg)) {
    return {
      code,
      error:
        "SMTP weigerde de afzender. Controleer Afzender (From) — moet een adres zijn dat je provider mag versturen.",
    };
  }
  return {
    code,
    error: "SMTP-verzenden mislukt. Controleer de e-mailinstellingen onder Admin → Instellingen → Verzenden.",
  };
}

async function loadSmtpTransportOptions(): Promise<
  | { ok: true; options: SMTPTransport.Options; meta: { host: string; port: number; user: string } }
  | { ok: false; error: string; code?: string }
> {
  const [hostRaw, userRaw, pass, portRaw, secureRaw] = await Promise.all([
    getRuntimeSetting("SMTP_HOST"),
    getRuntimeSetting("SMTP_USER"),
    smtpPassword(),
    getRuntimeSetting("SMTP_PORT"),
    getRuntimeSetting("SMTP_SECURE"),
  ]);
  const host = cleanSecret(hostRaw);
  const user = cleanSecret(userRaw);
  if (!host || !user || !pass) {
    return {
      ok: false,
      error:
        "SMTP is niet volledig geconfigureerd. Vul SMTP host, gebruiker en wachtwoord in onder Admin → Instellingen → Verzenden.",
    };
  }

  // Resend keys look like re_… — using them as SMTP password always fails AUTH.
  if (/^re_[A-Za-z0-9]/i.test(pass)) {
    return {
      ok: false,
      code: "EAUTH",
      error:
        "SMTP-wachtwoord lijkt een Resend API-key (begint met re_). Gebruik het wachtwoord van de mailbox, niet de Resend-key. Laat Resend leeg als je alleen SMTP wilt.",
    };
  }

  const port = Number(cleanSecret(portRaw) || "465");
  if (!Number.isFinite(port) || port <= 0) {
    return {
      ok: false,
      error: "Ongeldige SMTP-poort. Gebruik 465 (SSL) of 587 (STARTTLS).",
    };
  }

  const secure = parseSmtpSecure(secureRaw, port);

  const options: SMTPTransport.Options = {
    host,
    port,
    secure,
    auth: { user, pass },
    ...(port === 587 && !secure ? { requireTLS: true } : {}),
  };

  return { ok: true, options, meta: { host, port, user } };
}

/** Probe SMTP login before sending a campaign (fail fast with a clear message). */
export async function verifySmtpConnection(): Promise<SmtpSendResult> {
  const loaded = await loadSmtpTransportOptions();
  if (!loaded.ok) return loaded;

  const transporter = nodemailer.createTransport(loaded.options);
  try {
    await transporter.verify();
    return { ok: true };
  } catch (e) {
    const mapped = dutchSmtpError(e);
    console.error("[smtp-email] verify failed", {
      code: mapped.code,
      host: loaded.meta.host,
      port: loaded.meta.port,
      user: loaded.meta.user,
    });
    return { ok: false, ...mapped };
  }
}

export async function sendSmtpEmailResult(input: SmtpEmailInput): Promise<SmtpSendResult> {
  const loaded = await loadSmtpTransportOptions();
  if (!loaded.ok) return loaded;

  const from = await smtpFromAddress();
  const to = (Array.isArray(input.to) ? input.to : [input.to])
    .map((x) => x.trim())
    .filter(Boolean);
  if (!to.length) {
    return { ok: false, error: "Geen geldig ontvangeradres." };
  }

  const transporter = nodemailer.createTransport(loaded.options);
  const embedded = embedBrandLogoForSmtp(input.html);

  try {
    await transporter.sendMail({
      from,
      to: to.join(", "),
      subject: input.subject,
      text: input.text,
      ...(embedded.html ? { html: embedded.html } : {}),
      ...(embedded.attachments?.length ? { attachments: embedded.attachments } : {}),
    });
    return { ok: true };
  } catch (e) {
    const mapped = dutchSmtpError(e);
    console.error("[smtp-email]", {
      code: mapped.code,
      host: loaded.meta.host,
      port: loaded.meta.port,
      user: loaded.meta.user,
      message: e instanceof Error ? e.message : String(e),
    });
    return { ok: false, ...mapped };
  }
}

/** @deprecated Prefer sendSmtpEmailResult when you need the error message. */
export async function sendSmtpEmail(input: SmtpEmailInput): Promise<boolean> {
  return (await sendSmtpEmailResult(input)).ok;
}
