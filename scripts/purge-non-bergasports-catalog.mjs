#!/usr/bin/env node
/**
 * Verwijdert producten/categorieën die niet van bergasports.com komen.
 * Run: node scripts/purge-non-bergasports-catalog.mjs
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");

function loadEnvFile(filename) {
  const p = path.join(root, filename);
  if (!fs.existsSync(p)) return {};
  const env = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL ontbreekt");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl });
try {
  const delProducts = await pool.query(
    `DELETE FROM products
     WHERE url IS NULL
        OR url NOT ILIKE '%bergasports.com%'`,
  );
  const delCats = await pool.query(
    `DELETE FROM categories
     WHERE slug IN ('bumbac', 'uncategorized', 'uncategorized-2')
        OR (product_count = 0 AND slug IN ('bike-groups'))`,
  );
  console.log(`Verwijderd: ${delProducts.rowCount ?? 0} producten (niet bergasports.com)`);
  console.log(`Verwijderd: ${delCats.rowCount ?? 0} lege/legacy categorieën`);

  const counts = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM products) AS products,
       (SELECT count(*)::int FROM categories) AS categories`,
  );
  console.log("Over:", counts.rows[0]);
} finally {
  await pool.end();
}
