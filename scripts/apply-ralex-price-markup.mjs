/**
 * Verdubbelt alle Ralex-productprijzen in Supabase (100% markup: 89 → 178 Lei).
 * Slaat producten over die al gemarkeerd zijn met ralexMarkupFactor === 2.
 *
 * Usage: node scripts/apply-ralex-price-markup.mjs
 *        node scripts/apply-ralex-price-markup.mjs --force
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const MARKUP = 2;
const force = process.argv.includes("--force");

function loadEnvLocal() {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) {
    throw new Error("Missing .env.local");
  }
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

function mulPrice(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return value;
  return Math.round(value * MARKUP * 100) / 100;
}

function priceText(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value.toFixed(2);
}

function applyMarkup(product) {
  const next = { ...product };
  next.priceCurrent = mulPrice(next.priceCurrent);
  next.priceDiscounted = mulPrice(next.priceDiscounted);
  next.priceOld = mulPrice(next.priceOld);
  next.priceRangeMax = mulPrice(next.priceRangeMax);
  if (next.priceCurrent != null) next.priceCurrentText = priceText(next.priceCurrent);
  if (next.priceDiscounted != null) next.priceDiscountedText = priceText(next.priceDiscounted);

  if (next.wcVariations?.length) {
    next.wcVariations = next.wcVariations.map((v) => ({
      ...v,
      price: mulPrice(v.price) ?? v.price,
      regularPrice: mulPrice(v.regularPrice) ?? v.regularPrice,
    }));
    const prices = next.wcVariations.map((v) => v.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    next.priceDiscounted = minP;
    next.priceDiscountedText = priceText(minP);
    next.priceCurrent = minP;
    next.priceCurrentText = priceText(minP);
    next.priceRangeMax = maxP;
  }

  if (next.landingPromo) {
    next.landingPromo = {
      ...next.landingPromo,
      price: mulPrice(next.landingPromo.price) ?? next.landingPromo.price,
      oldPrice: mulPrice(next.landingPromo.oldPrice) ?? next.landingPromo.oldPrice,
    };
  }

  if (next.cartBundlePromos?.tiers?.length) {
    next.cartBundlePromos = {
      tiers: next.cartBundlePromos.tiers.map((tier) => ({
        ...tier,
        price: mulPrice(tier.price) ?? tier.price,
        listSubtotal: mulPrice(tier.listSubtotal) ?? tier.listSubtotal,
      })),
    };
  }

  next.ralexMarkupFactor = MARKUP;
  return next;
}

function productToDbRow(product) {
  const featuredOnHomepage = Boolean(product.featuredOnHomepage);
  const data = { ...product, featuredOnHomepage };
  return {
    id: product.id,
    data,
    name: product.name,
    brand: product.brand ?? null,
    category: product.category ?? null,
    catalog_source: product.catalogSource === "ralex" ? "ralex" : product.catalogSource === "manual" ? "manual" : "trendyol",
    price_current: product.priceCurrent ?? null,
    price_discounted: product.priceDiscounted ?? null,
    currency: product.currency ?? "Lei",
    image: product.image,
    url: product.url,
    featured_on_homepage: featuredOnHomepage,
    updated_at: new Date().toISOString(),
  };
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local");
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

let from = 0;
const pageSize = 200;
let updated = 0;
let skipped = 0;
let totalRalex = 0;

while (true) {
  const { data, error } = await supabase
    .from("products")
    .select("id, data, catalog_source")
    .eq("catalog_source", "ralex")
    .order("id", { ascending: true })
    .range(from, from + pageSize - 1);

  if (error) throw new Error(error.message);
  if (!data?.length) break;

  for (const row of data) {
    totalRalex += 1;
    const raw = row.data;
    if (!force && raw?.ralexMarkupFactor === MARKUP) {
      skipped += 1;
      continue;
    }
    const product = applyMarkup({ ...raw, id: raw.id ?? row.id, catalogSource: "ralex" });
    const { error: upErr } = await supabase.from("products").upsert(productToDbRow(product), { onConflict: "id" });
    if (upErr) {
      console.error("Failed id", row.id, upErr.message);
      process.exit(1);
    }
    updated += 1;
  }

  if (data.length < pageSize) break;
  from += pageSize;
  process.stderr.write(`\rProcessed ${from} rows…`);
}

console.log(`\nRalex products: ${totalRalex}, updated: ${updated}, skipped (already marked): ${skipped}`);
