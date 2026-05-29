/**
 * Schrijft per batch een .sql-bestand voor Supabase MCP execute_sql.
 * Gebruik: node scripts/generate-products-sync-sql-chunks.mjs
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "src/data/trendyol-products.json");
const OUT_DIR = path.join(ROOT, "tmp/supabase-products-sync");

const BATCH = 45;

const raw = fs.readFileSync(DATA, "utf8");
const db = JSON.parse(raw);
const products = db.products;

fs.mkdirSync(OUT_DIR, { recursive: true });
const files = [];

for (let i = 0, part = 0; i < products.length; i += BATCH, part++) {
  const chunk = products.slice(i, i + BATCH);
  const arr = JSON.stringify(chunk);
  const tag = `$p${crypto.randomBytes(12).toString("hex")}$`;
  const sql = `INSERT INTO public.products (id, data)
SELECT (elem->>'id')::bigint, elem
FROM jsonb_array_elements(${tag}${arr}${tag}::jsonb) AS elem
ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now();`;
  const name = `chunk-${String(part).padStart(3, "0")}.sql`;
  const fp = path.join(OUT_DIR, name);
  fs.writeFileSync(fp, sql, "utf8");
  files.push(fp);
}

fs.writeFileSync(
  path.join(OUT_DIR, "manifest.json"),
  JSON.stringify({ productCount: products.length, batchSize: BATCH, files: files.map((f) => path.basename(f)) }, null, 2),
  "utf8",
);

console.log(JSON.stringify({ outDir: OUT_DIR, chunks: files.length, products: products.length }));
