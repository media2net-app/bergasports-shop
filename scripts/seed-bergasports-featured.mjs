#!/usr/bin/env node
/** Zet 8 Bergasports-producten op de homepage (featured_on_homepage). */
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
if (!env.DATABASE_URL) {
  console.error("DATABASE_URL ontbreekt");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
try {
  await pool.query(`UPDATE products SET featured_on_homepage = false`);
  const pick = await pool.query(
    `SELECT id FROM products
     WHERE url ILIKE '%bergasports.com%'
     ORDER BY
       CASE WHEN category ILIKE '%bikes%' OR category ILIKE '%bike%' THEN 0 ELSE 1 END,
       updated_at DESC
     LIMIT 8`,
  );
  const ids = pick.rows.map((r) => r.id);
  if (!ids.length) {
    console.log("Geen producten om te featuren.");
    process.exit(0);
  }
  await pool.query(`UPDATE products SET featured_on_homepage = true WHERE id = ANY($1::bigint[])`, [
    ids,
  ]);
  for (const row of pick.rows) {
    await pool.query(
      `UPDATE products SET data = jsonb_set(data, '{featuredOnHomepage}', 'true'::jsonb, true) WHERE id = $1`,
      [row.id],
    );
  }
  console.log(`Homepage featured: ${ids.length} producten`);
} finally {
  await pool.end();
}
