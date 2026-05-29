#!/usr/bin/env node
/**
 * Test Easy-Sales API connection. Loads .env.local from project root.
 * Usage: node scripts/test-easy-sales.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const token = process.env.EASY_SALES_API_TOKEN?.trim();
const websiteToken = process.env.EASY_SALES_WEBSITE_TOKEN?.trim();
const baseUrl = (process.env.EASY_SALES_API_BASE_URL || "https://easy-sales.com/api/v2").replace(/\/$/, "");

if (!token) {
  console.error("Missing EASY_SALES_API_TOKEN in .env.local");
  process.exit(1);
}

async function get(path) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await res.text();
  return { status: res.status, text };
}

console.log("Base URL:", baseUrl);
console.log("Website token set:", Boolean(websiteToken));

const list = await get("/websites/list");
console.log("\nGET /websites/list →", list.status);
console.log(list.text.slice(0, 500));

if (websiteToken) {
  const payload = {
    website_token: websiteToken,
    source: "api",
    order: {
      order_id: `TEST-${Date.now()}`,
      order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      order_total: 1,
      currency: "RON",
      status: 1,
      payment_mode: 1,
      shipment_tax: 0,
      observations: "API connection test — safe to delete",
      customer: {
        name: "Test",
        phone: "+40000000000",
        email: "test@example.com",
        legal_entity: 0,
      },
      shipping_address: {
        name: "Test",
        phone: "+40000000000",
        country: "RO",
        city: "Bucuresti",
        street: "Test 1",
        postal_code: "010001",
      },
      billing_address: {
        name: "Test",
        phone: "+40000000000",
        country: "RO",
        city: "Bucuresti",
        street: "Test 1",
        postal_code: "010001",
      },
      order_products: [
        {
          product_website_id: "0",
          sku: "test-sku",
          name: "Connection test product",
          quantity: 1,
          price: 1,
          total: 1,
          tax: 0,
        },
      ],
    },
  };

  const res = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log("\nPOST /orders (test) →", res.status);
  console.log(text.slice(0, 800));
}
