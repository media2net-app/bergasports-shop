/**
 * Zet absolute bergasports.com product-image URL's om naar relatieve /product-images/…
 * node scripts/rewrite-product-image-urls.mjs
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const PREFIXES = [
  "https://www.bergasports.com",
  "http://www.bergasports.com",
  "https://www.bergasports.com",
  "http://www.bergasports.com",
  "http://localhost:3000",
  "https://localhost:3000",
  "http://localhost:3060",
  "https://localhost:3060",
];

function loadEnvFile(filename) {
  const p = path.join(root, filename);
  if (!fs.existsSync(p)) return {};
  const env = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let value = t.slice(eq + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    env[t.slice(0, eq).trim()] = value;
  }
  return env;
}

function toRelative(url) {
  if (typeof url !== "string" || !url.trim()) return url;
  let u = url.trim();
  for (const p of PREFIXES) {
    if (u.startsWith(p)) {
      u = u.slice(p.length);
      break;
    }
  }
  if (u.startsWith("/product-images/")) return u;
  return url;
}

function walk(value) {
  if (typeof value === "string") {
    return toRelative(value);
  }
  if (Array.isArray(value)) {
    return value.map(walk);
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = walk(v);
    }
    return out;
  }
  return value;
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const client = await pool.connect();

try {
  const { rows } = await client.query("SELECT id, image, data FROM products ORDER BY id");
  let updated = 0;
  for (const row of rows) {
    const data = walk(row.data);
    const image = toRelative(row.image);
    const before = JSON.stringify({ image: row.image, data: row.data });
    const after = JSON.stringify({ image, data });
    if (before === after) continue;
    await client.query("UPDATE products SET image = $1, data = $2::jsonb WHERE id = $3", [
      image,
      JSON.stringify(data),
      row.id,
    ]);
    updated += 1;
  }

  const assets = await client.query(
    `UPDATE product_image_assets SET public_url = regexp_replace(public_url, '^https?://[^/]+', '')
     WHERE public_url LIKE '%/product-images/%'`,
  );

  console.log(`Products bijgewerkt: ${updated}/${rows.length}`);
  console.log(`Image assets bijgewerkt: ${assets.rowCount ?? 0}`);
} finally {
  client.release();
  await pool.end();
}
