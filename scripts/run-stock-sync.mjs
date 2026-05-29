/**
 * One-off: pull Easy Sales stock into Supabase (same logic as admin sync).
 * Usage: node scripts/run-stock-sync.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    if (!process.env[key]) process.env[key] = t.slice(i + 1).trim();
  }
}

const { matchEasySalesProductsToShop } = await import(
  "../src/lib/easy-sales-product-match.ts"
);

const base = (process.env.EASY_SALES_API_BASE_URL || "https://easy-sales.com/api/v2").replace(/\/$/, "");
const token = process.env.EASY_SALES_API_TOKEN?.trim();
const wt = process.env.EASY_SALES_WEBSITE_TOKEN?.trim();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAllEs() {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(
      `${base}/products?website_token=${encodeURIComponent(wt || "")}&per_page=50&page=${page}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
    );
    const j = await res.json();
    if (!res.ok) throw new Error(j.message || `ES HTTP ${res.status}`);
    all.push(...(j.data || []));
    if (page >= (j.meta?.last_page || 1)) break;
  }
  return all;
}

async function fetchAllShop() {
  const out = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, data")
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const row of data) {
      const d = row.data;
      out.push({ ...d, id: typeof d.id === "number" ? d.id : row.id });
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}

function available(stock, reserved) {
  const r = typeof reserved === "number" ? Math.max(0, reserved) : 0;
  return Math.max(0, Math.floor(stock - r));
}

const esProducts = await fetchAllEs();
const shopProducts = await fetchAllShop();
const matches = matchEasySalesProductsToShop(esProducts, shopProducts);
const syncedAt = new Date().toISOString();
let updated = 0;

for (const m of matches) {
  const shop = shopProducts.find((p) => p.id === m.shopId);
  if (!shop) continue;
  const stockQuantity = typeof m.es.stock === "number" ? Math.max(0, m.es.stock) : 0;
  const reservedStock =
    typeof m.es.reserved_stock === "number" ? Math.max(0, m.es.reserved_stock) : 0;
  const data = {
    ...shop,
    stockQuantity,
    reservedStock,
    easySalesProductId: m.es.id,
    easySalesSku: m.es.sku?.trim() || undefined,
    stockSyncedAt: syncedAt,
    inStock: available(stockQuantity, reservedStock) > 0,
  };
  const { error } = await supabase
    .from("products")
    .update({
      data,
      updated_at: syncedAt,
    })
    .eq("id", m.shopId);
  if (error) {
    console.error("update failed", m.shopId, error.message);
  } else {
    updated++;
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      easySalesProductCount: esProducts.length,
      shopProductCount: shopProducts.length,
      matched: matches.length,
      updated,
      unmatchedEasySales: esProducts.length - new Set(matches.map((x) => x.es.id)).size,
      byMethod: {
        website_id: matches.filter((x) => x.method === "website_id").length,
        sku: matches.filter((x) => x.method === "sku").length,
        name: matches.filter((x) => x.method === "name").length,
      },
    },
    null,
    2,
  ),
);
