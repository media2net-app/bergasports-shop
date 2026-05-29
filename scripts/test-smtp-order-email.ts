/**
 * Send a one-off "new order" style test email via Hostinger SMTP (HTML + plain text).
 * Usage: npx tsx scripts/test-smtp-order-email.ts recipient@example.com
 */
import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

import { buildAdminNewOrderTestEmailParts } from "../src/lib/transactional-order-emails.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

function loadEnv() {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) throw new Error("Missing .env.local");
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

const to = process.argv[2]?.trim();
if (!to) {
  console.error("Usage: npx tsx scripts/test-smtp-order-email.ts recipient@example.com");
  process.exit(1);
}

const env = loadEnv();
for (const [k, v] of Object.entries(env)) {
  if (!process.env[k]) {
    process.env[k] = v;
  }
}

const host = env.SMTP_HOST?.trim();
const user = env.SMTP_USER?.trim();
const pass = env.SMTP_PASS?.trim() || env.SMTP_PASSWORD?.trim();
const port = Number(env.SMTP_PORT?.trim() || "465");
const secure = env.SMTP_SECURE === "false" ? false : env.SMTP_SECURE === "true" ? true : port === 465;
const from =
  env.SMTP_FROM?.trim() ||
  env.ORDER_NOTIFICATION_FROM?.trim() ||
  (user ? `E-Store House <${user}>` : null);

if (!host || !user || !pass || !from) {
  console.error("Missing SMTP_HOST, SMTP_USER, SMTP_PASS (or SMTP_PASSWORD), or from address in .env.local");
  process.exit(1);
}

const { subject, text, html } = buildAdminNewOrderTestEmailParts(
  {
    orderNumber: "TEST-PSI-001",
    customerName: "Test Client",
    customerPhone: "+40 700 000 000",
    total: 0,
    currency: "RON",
    shippingCity: "București",
  },
  "[TEST] ",
);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  ...(port === 587 && !secure ? { requireTLS: true } : {}),
});

const info = await transporter.sendMail({ from, to, subject, text, html });
console.log(JSON.stringify({ ok: true, messageId: info.messageId, to, from }, null, 2));
