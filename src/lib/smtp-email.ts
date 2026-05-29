import "server-only";

import nodemailer from "nodemailer";

export type SmtpEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

function smtpPassword(): string | null {
  return (
    process.env.SMTP_PASS?.trim() ||
    process.env.SMTP_PASSWORD?.trim() ||
    null
  );
}

/** Hostinger and other SMTP: set SMTP_HOST, SMTP_USER, SMTP_PASS (or SMTP_PASSWORD). */
export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = smtpPassword();
  return Boolean(host && user && pass);
}

function smtpFromAddress(): string {
  return (
    process.env.SMTP_FROM?.trim() ||
    process.env.ORDER_NOTIFICATION_FROM?.trim() ||
    (() => {
      const user = process.env.SMTP_USER?.trim();
      return user ? `Bergasports <${user}>` : "Bergasports <info@bergasports.com>";
    })()
  );
}

export async function sendSmtpEmail(input: SmtpEmailInput): Promise<boolean> {
  if (!isSmtpConfigured()) {
    return false;
  }

  const host = process.env.SMTP_HOST!.trim();
  const user = process.env.SMTP_USER!.trim();
  const pass = smtpPassword()!;
  const port = Number(process.env.SMTP_PORT?.trim() || "465");
  const secure =
    process.env.SMTP_SECURE === "false"
      ? false
      : process.env.SMTP_SECURE === "true"
        ? true
        : port === 465;

  const to = (Array.isArray(input.to) ? input.to : [input.to]).map((x) => x.trim()).filter(Boolean);
  if (!to.length) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    ...(port === 587 && !secure ? { requireTLS: true } : {}),
  });

  try {
    await transporter.sendMail({
      from: smtpFromAddress(),
      to: to.join(", "),
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
    });
    return true;
  } catch (e) {
    console.error("[smtp-email]", e);
    return false;
  }
}
