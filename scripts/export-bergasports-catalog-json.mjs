#!/usr/bin/env node
/** Exporteert Prisma-catalogus naar src/data/bergasports-catalog.json (geen Hotelink/Ralex). */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const outFile = path.join(root, "src/data/bergasports-catalog.json");
const legacyFile = path.join(root, "src/data/trendyol-products.json");

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
if (!env.DATABASE_URL) {
  console.error("DATABASE_URL ontbreekt");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const rows = await pool.query("SELECT data FROM products ORDER BY id ASC");
await pool.end();

const products = rows.rows.map((r) => r.data);
const out = {
  source: "https://www.bergasports.com/",
  seller: "Bergasports",
  scrapedAt: new Date().toISOString(),
  count: products.length,
  products,
};

const json = `${JSON.stringify(out, null, 2)}\n`;
fs.writeFileSync(outFile, json);
fs.writeFileSync(legacyFile, json);
console.log(`Exported ${products.length} products → ${outFile}`);
console.log(`Legacy stub updated → ${legacyFile}`);
