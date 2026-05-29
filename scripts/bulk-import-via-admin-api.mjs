/**
 * Importeert alle leaf-categorieën via POST /api/admin/categories/:id/import-products
 * Vereist: dev/prod server draait + ADMIN_JWT_SECRET + DATABASE_URL in .env.local
 *
 *   node scripts/bulk-import-via-admin-api.mjs
 *   BASE_URL=https://www.bergasports.com node scripts/bulk-import-via-admin-api.mjs
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { SignJWT } from "jose";

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

async function createAdminToken(secret) {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ role: "super_admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .setIssuedAt()
    .sign(key);
}

async function fetchLeafCategories(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const res = await pool.query(
      `SELECT c.id, c.name, c.slug, c.product_count
       FROM categories c
       WHERE c.product_count > 0
         AND c.id NOT IN (SELECT DISTINCT parent_id FROM categories WHERE parent_id > 0)
       ORDER BY c.parent_id, c.id`,
    );
    return res.rows;
  } finally {
    await pool.end();
  }
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
const secret = env.ADMIN_JWT_SECRET;
const databaseUrl = env.DATABASE_URL;
const baseUrl = (
  process.env.BASE_URL ||
  (process.env.USE_LOCAL_ADMIN === "1" ? "http://localhost:3000" : null) ||
  env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

if (!secret || secret.length < 16) {
  console.error("ADMIN_JWT_SECRET ontbreekt of is te kort (min. 16 tekens)");
  process.exit(1);
}
if (!databaseUrl) {
  console.error("DATABASE_URL ontbreekt");
  process.exit(1);
}

const token = await createAdminToken(secret);
const categories = await fetchLeafCategories(databaseUrl);

console.log(`Base URL: ${baseUrl}`);
console.log(`Import ${categories.length} leaf categories (${categories.reduce((s, c) => s + c.product_count, 0)} verwachte producten)\n`);

let totalImported = 0;
let failed = 0;

for (let i = 0; i < categories.length; i++) {
  const cat = categories[i];
  const label = `[${i + 1}/${categories.length}] ${cat.id} ${cat.slug}`;
  process.stdout.write(`${label} … `);

  try {
    const res = await fetch(`${baseUrl}/api/admin/categories/${cat.id}/import-products`, {
      method: "POST",
      headers: { Cookie: `admin_session=${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      failed += 1;
      console.log(`FAIL ${res.status}: ${body.error || res.statusText}`);
      continue;
    }
    totalImported += body.imported ?? 0;
    const complete = body.importComplete ? "✓" : "partial";
    console.log(`ok — ${body.imported} imported (${body.categoryLabel}) ${complete}`);
  } catch (e) {
    failed += 1;
    console.log(`ERROR ${e instanceof Error ? e.message : e}`);
  }

  await new Promise((r) => setTimeout(r, 500));
}

console.log(`\nKlaar: ${totalImported} producten geïmporteerd, ${failed} categorieën mislukt.`);

if (failed > 0) {
  process.exit(1);
}
