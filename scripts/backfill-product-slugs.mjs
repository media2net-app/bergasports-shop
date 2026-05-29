/**
 * Persist SEO slugs for all products (title-based, unique).
 * Run from project root: node scripts/backfill-product-slugs.mjs
 *
 * Requires .env.local with SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PAGE_SIZE = 1000;

function loadEnvLocal() {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) {
    throw new Error("Missing .env.local");
  }
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function slugify(title) {
  return String(title ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function uniqueSlug(base, productId, used) {
  const root = slugify(base) || `product-${productId}`;
  if (!used.has(root) || used.get(root) === productId) return root;
  for (let n = 2; n < 500; n++) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate) || used.get(candidate) === productId) return candidate;
  }
  return `product-${productId}`;
}

async function fetchAllProducts(supabase) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, data, name, slug")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(error.message);
    }
    if (!data?.length) {
      break;
    }
    rows.push(...data);
    if (data.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }
  return rows;
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const allRows = await fetchAllProducts(supabase);
const used = new Map();
const assignments = [];

for (const row of allRows) {
  const raw = row.data && typeof row.data === "object" ? row.data : {};
  const name = raw.name ?? row.name ?? "";
  const slug = uniqueSlug(name, row.id, used);
  used.set(slug, row.id);
  assignments.push({ row, raw, slug });
}

let updated = 0;
for (const { row, raw, slug } of assignments) {
  const stored = (row.slug ?? raw.slug ?? "").trim().toLowerCase();
  if (stored === slug) {
    continue;
  }
  const nextData = { ...raw, slug };
  const root = slugify(raw.name ?? row.name ?? "") || `product-${row.id}`;
  let finalSlug = slug;
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate =
      attempt === 0 ? slug : `${root}-${attempt + 1}`.slice(0, 120);
    const { error: upErr } = await supabase
      .from("products")
      .update({ slug: candidate, data: { ...nextData, slug: candidate } })
      .eq("id", row.id);
    if (!upErr) {
      used.set(candidate, row.id);
      finalSlug = candidate;
      updated += 1;
      break;
    }
    if (!upErr?.message?.includes("products_slug_unique_idx")) {
      console.error(`Product ${row.id}:`, upErr.message);
      process.exit(1);
    }
  }
  if (finalSlug !== slug && finalSlug.startsWith(slug)) {
    console.warn(`Product ${row.id}: slug adjusted to ${finalSlug}`);
  }
}

console.log(`Done. ${allRows.length} products, updated ${updated} slug(s).`);
