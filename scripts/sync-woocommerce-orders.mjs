#!/usr/bin/env node
/**
 * Sync WooCommerce orders → Prisma.
 * Usage: node scripts/sync-woocommerce-orders.mjs [--recent-days=90] [--max-pages=50]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const out = {};
  for (const file of [".env", ".env.local", ".env.production.local"]) {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const eq = t.indexOf("=");
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[t.slice(0, eq).trim()] = v;
    }
  }
  return out;
}

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function money(value) {
  const n = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function mapStatus(status) {
  switch (status) {
    case "pending":
    case "checkout-draft":
      return "awaiting_payment";
    case "on-hold":
      return "pending";
    case "processing":
      return "processing";
    case "completed":
      return "delivered";
    case "cancelled":
    case "refunded":
    case "failed":
      return "cancelled";
    default:
      return "pending";
  }
}

const env = { ...loadEnv(), ...process.env };
const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL;
const key = env.WC_CONSUMER_KEY;
const secret = env.WC_CONSUMER_SECRET;
const base = (env.WC_STORE_BASE_URL || "https://www.bergasports.com").replace(/\/$/, "");
if (!databaseUrl || !key || !secret) {
  console.error("Need DATABASE_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET");
  process.exit(1);
}

const recentDays = Number(arg("recent-days", "0"));
const maxPages = Number(arg("max-pages", "20"));
const auth = Buffer.from(`${key}:${secret}`).toString("base64");
const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? undefined : { rejectUnauthorized: false },
});

let page = 1;
let totalPages = 1;
let created = 0;
let updated = 0;
let fetched = 0;

while (page <= totalPages && page <= maxPages) {
  const params = new URLSearchParams({
    page: String(page),
    per_page: "50",
    orderby: "date",
    order: "desc",
  });
  if (recentDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() - recentDays);
    params.set("modified_after", d.toISOString());
  }
  const res = await fetch(`${base}/wp-json/wc/v3/orders?${params}`, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
  });
  if (!res.ok) {
    console.error(await res.text());
    process.exit(1);
  }
  const orders = await res.json();
  totalPages = Number.parseInt(res.headers.get("X-WP-TotalPages") || "1", 10) || 1;
  console.log(`page ${page}/${totalPages}: ${orders.length} orders`);

  for (const order of orders) {
    const orderNumber = `WC-${order.number || order.id}`;
    const total = money(order.total);
    const discountTotal = money(order.discount_total);
    const subtotal = Math.round((total + discountTotal) * 100) / 100;
    const currency = (order.currency || "EUR").toUpperCase();
    const status = mapStatus(order.status);
    const createdAt = new Date(order.date_created_gmt || order.date_created || Date.now());
    const b = order.billing || {};
    const s = order.shipping || {};
    const customerName =
      `${b.first_name || ""} ${b.last_name || ""}`.trim() ||
      `${s.first_name || ""} ${s.last_name || ""}`.trim() ||
      b.email ||
      orderNumber;
    const phone = b.phone?.trim() || b.email?.trim() || "—";
    const shippingAddress = s.address_1?.trim() || b.address_1?.trim() || "—";
    const shippingCity = s.city?.trim() || b.city?.trim() || "—";

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(`SELECT id FROM orders WHERE order_number = $1`, [orderNumber]);
      let orderId;
      if (existing.rows[0]) {
        orderId = existing.rows[0].id;
        await client.query(`DELETE FROM order_items WHERE order_id = $1`, [orderId]);
        await client.query(
          `UPDATE orders SET
            status=$2, customer_name=$3, customer_email=$4, customer_phone=$5,
            shipping_address=$6, shipping_city=$7, shipping_county=$8, shipping_postal_code=$9,
            notes=$10, payment_method=$11, currency=$12, subtotal=$13, discount_total=$14, total=$15,
            updated_at=NOW()
           WHERE id=$1`,
          [
            orderId,
            status,
            customerName,
            b.email?.trim() || null,
            phone,
            shippingAddress,
            shippingCity,
            s.state?.trim() || b.state?.trim() || null,
            s.postcode?.trim() || b.postcode?.trim() || null,
            order.customer_note?.trim() || null,
            order.payment_method_title || order.payment_method || "woocommerce",
            currency,
            subtotal,
            discountTotal,
            total,
          ],
        );
        updated += 1;
      } else {
        const ins = await client.query(
          `INSERT INTO orders (
            order_number, status, customer_name, customer_email, customer_phone,
            shipping_address, shipping_city, shipping_county, shipping_postal_code,
            notes, payment_method, currency, subtotal, discount_total, total,
            marketing_consent, created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,false,$16,NOW()
          ) RETURNING id`,
          [
            orderNumber,
            status,
            customerName,
            b.email?.trim() || null,
            phone,
            shippingAddress,
            shippingCity,
            s.state?.trim() || b.state?.trim() || null,
            s.postcode?.trim() || b.postcode?.trim() || null,
            order.customer_note?.trim() || null,
            order.payment_method_title || order.payment_method || "woocommerce",
            currency,
            subtotal,
            discountTotal,
            total,
            createdAt.toISOString(),
          ],
        );
        orderId = ins.rows[0].id;
        created += 1;
      }

      for (const item of order.line_items || []) {
        const lineTotal = money(item.total);
        const qty = Math.max(1, item.quantity || 1);
        const unitPrice =
          item.price != null && Number.isFinite(Number(item.price))
            ? Math.round(Number(item.price) * 100) / 100
            : Math.round((lineTotal / qty) * 100) / 100;
        await client.query(
          `INSERT INTO order_items (
            order_id, product_id, line_id, name, quantity, unit_price, line_total, currency, image, variation_label
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,null,$9)`,
          [
            orderId,
            item.product_id || null,
            `wc-${item.id}`,
            item.name || `Product ${item.product_id}`,
            qty,
            unitPrice,
            lineTotal,
            currency,
            item.variation_id ? `var ${item.variation_id}` : null,
          ],
        );
      }
      await client.query("COMMIT");
      fetched += 1;
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("fail", orderNumber, e.message);
    } finally {
      client.release();
    }
  }
  page += 1;
}

await pool.end();
console.log({ fetched, created, updated, pages: page - 1 });
