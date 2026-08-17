/**
 * Importeert producten per categorie van lenjeriihotel.com (WooCommerce Store API).
 *
 *   node scripts/import-hotel-products.mjs              # alle leaf-categorieën
 *   node scripts/import-hotel-products.mjs 20 32        # alleen deze WC category ID's
 *   node scripts/import-hotel-products.mjs --dry-run 20 # alleen tellen, geen DB
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const WC_BASE =
  (process.env.WC_STORE_BASE_URL || "https://lenjeriihotel.com").replace(/\/$/, "");
const PRODUCTS = `${WC_BASE}/wp-json/wc/store/v1/products`;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const categoryIds = args.filter((a) => a !== "--dry-run").map((a) => Number(a)).filter(Number.isFinite);

function loadEnvFile(filename) {
  const p = path.join(root, filename);
  if (!fs.existsSync(p)) return {};
  const env = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

async function fetchProductsPage(categoryId, page) {
  const url = `${PRODUCTS}?category=${categoryId}&per_page=100&page=${page}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Store API ${r.status} cat=${categoryId} page=${page}`);
  const products = await r.json();
  const totalPages = Number(r.headers.get("x-wp-totalpages") || "1");
  return { products: Array.isArray(products) ? products : [], totalPages };
}

async function countProductsForCategory(categoryId) {
  let page = 1;
  let total = 0;
  let totalPages = 1;
  do {
    const batch = await fetchProductsPage(categoryId, page);
    totalPages = batch.totalPages;
    total += batch.products.length;
    if (!batch.products.length || page >= totalPages) break;
    page += 1;
    await new Promise((r) => setTimeout(r, 80));
  } while (page <= totalPages);
  return total;
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
if (!dryRun && !env.DATABASE_URL) {
  console.error("DATABASE_URL ontbreekt");
  process.exit(1);
}

let targets = categoryIds;
if (!targets.length) {
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  const res = await pool.query(
    `SELECT id, name, slug, product_count FROM categories
     WHERE product_count > 0
     AND id NOT IN (SELECT DISTINCT parent_id FROM categories WHERE parent_id > 0)
     ORDER BY parent_id, id`,
  );
  await pool.end();
  targets = res.rows.map((r) => r.id);
  console.log(`Leaf categories (${targets.length}):`);
  for (const row of res.rows) {
    console.log(`  ${row.id} ${row.slug} — ${row.name} (${row.product_count})`);
  }
}

if (dryRun) {
  console.log("\nDry run — product counts from Store API:");
  for (const id of targets) {
    const n = await countProductsForCategory(id);
    console.log(`  category ${id}: ${n} products`);
  }
  process.exit(0);
}

console.log("\nStart import via admin API is aanbevolen voor volledige variaties.");
console.log("CLI: roep per categorie de Next admin route aan, of gebruik Admin → Import → Ralex.\n");
console.log("Voorbeeld eerste categorie (LENJERII DE PAT, id 20):");
console.log("  curl -X POST http://localhost:3060/api/admin/categories/20/import-products \\");
console.log("    -H 'Cookie: <admin-session>'");

for (const id of targets.slice(0, 3)) {
  const n = await countProductsForCategory(id);
  console.log(`  WC category ${id}: ${n} products bereikbaar via Store API`);
}

console.log(`\nTotaal ${targets.length} categorieën te importeren. Gebruik admin bulk-import voor de volledige run.`);
