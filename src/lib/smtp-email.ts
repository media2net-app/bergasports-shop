import "server-only";

import nodemailer from "nodemailer";

import { getRuntimeSetting } from "@/lib/site-settings-db";

export type SmtpEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

async function smtpPassword(): Promise<string> {
  return (
    (await getRuntimeSetting("SMTP_PASS")).trim() ||
    process.env.SMTP_PASSWORD?.trim() ||
    ""
  );
}

export async function isSmtpConfigured(): Promise<boolean> {
  const [host, user, pass] = await Promise.all([
    getRuntimeSetting("SMTP_HOST"),
    getRuntimeSetting("SMTP_USER"),
    smtpPassword(),
  ]);
  return Boolean(host && user && pass);
}

async function smtpFromAddress(): Promise<string> {
  const from = (await getRuntimeSetting("SMTP_FROM")).trim();
  if (from) return from;
  const orderFrom = (await getRuntimeSetting("ORDER_NOTIFICATION_FROM")).trim();
  if (orderFrom) return orderFrom;
  const user = (await getRuntimeSetting("SMTP_USER")).trim();
  return user ? `Bergasports <${user}>` : "Bergasports <info@bergasports.com>";
}

export async function sendSmtpEmail(input: SmtpEmailInput): Promise<boolean> {
  if (!(await isSmtpConfigured())) {
    return false;
  }

  const [host, user, pass, portRaw, secureRaw, from] = await Promise.all([
    getRuntimeSetting("SMTP_HOST"),
    getRuntimeSetting("SMTP_USER"),
    smtpPassword(),
    getRuntimeSetting("SMTP_PORT"),
    getRuntimeSetting("SMTP_SECURE"),
    smtpFromAddress(),
  ]);
  const port = Number(portRaw.trim() || "465");
  const secure =
    secureRaw === "false" ? false : secureRaw === "true" ? true : port === 465;

  const to = (Array.isArray(input.to) ? input.to : [input.to]).map((x) => x.trim()).filter(Boolean);
  if (!to.length) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: host.trim(),
    port,
    secure,
    auth: { user: user.trim(), pass },
    ...(port === 587 && !secure ? { requireTLS: true } : {}),
  });

  try {
    await transporter.sendMail({
      from,
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
