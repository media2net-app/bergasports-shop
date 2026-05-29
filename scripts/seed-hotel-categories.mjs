/**
 * Vervangt alle categorieën door WooCommerce product_cat van lenjeriihotel.com
 * (echte ID's — nodig voor product-import via Store API).
 * node scripts/seed-hotel-categories.mjs
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const WC_CAT_API =
  process.env.WC_STORE_BASE_URL?.replace(/\/$/, "") ||
  "https://lenjeriihotel.com";

/** Slugs die niet in de shop-menu's horen (legacy Ralex). */
const EXCLUDED_SLUGS = new Set(["bumbac"]);

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

function categoryShopPath(slug) {
  const s = slug.trim().toLowerCase();
  return s && !EXCLUDED_SLUGS.has(s) ? `/${s}` : "/shop";
}

async function fetchAllProductCats() {
  const all = [];
  let page = 1;
  for (;;) {
    const url = `${WC_CAT_API}/wp-json/wp/v2/product_cat?per_page=100&page=${page}`;
    const r = await fetch(url);
    if (!r.ok) {
      throw new Error(`HTTP ${r.status} ${url}`);
    }
    const batch = await r.json();
    if (!Array.isArray(batch) || !batch.length) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return all.filter((c) => !EXCLUDED_SLUGS.has(String(c.slug).toLowerCase()));
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL in .env or .env.local");
  process.exit(1);
}

const remote = await fetchAllProductCats();
const categories = remote.map((c) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  parent: c.parent ?? 0,
  count: c.count ?? 0,
  link: categoryShopPath(c.slug),
}));

const now = new Date().toISOString();
const pool = new pg.Pool({ connectionString: databaseUrl });

try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const deleted = await client.query("DELETE FROM categories");
    console.log(`Deleted ${deleted.rowCount ?? 0} old categories`);

    await client.query(
      `INSERT INTO catalog_meta (id, source, source_api, fetched_at, updated_at)
       VALUES (1, $1, $2, $3, $4::timestamptz)
       ON CONFLICT (id) DO UPDATE SET
         source = EXCLUDED.source,
         source_api = EXCLUDED.source_api,
         fetched_at = EXCLUDED.fetched_at,
         updated_at = EXCLUDED.updated_at`,
      [
        "https://lenjeriihotel.com/magazin/",
        `${WC_CAT_API}/wp-json/wp/v2/product_cat`,
        now,
        now,
      ],
    );

    for (const c of categories) {
      await client.query(
        `INSERT INTO categories (
          id, name, slug, parent_id, product_count, link,
          import_completed_at, imported_product_count, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,NULL,NULL,$7)`,
        [c.id, c.name, c.slug, c.parent, c.count, c.link, now],
      );
    }

    await client.query("COMMIT");
    const roots = categories.filter((c) => c.parent === 0);
    console.log(`Seeded ${categories.length} categories (WooCommerce ID's van lenjeriihotel.com)`);
    for (const r of roots) {
      const kids = categories.filter((c) => c.parent === r.id);
      console.log(`  · ${r.name} (id ${r.id}, ${r.count} prod.) — ${kids.length} subcategorieën`);
    }
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const out = {
    source: "https://lenjeriihotel.com/magazin/",
    sourceApi: `${WC_CAT_API}/wp-json/wp/v2/product_cat`,
    fetchedAt: now,
    totalCategories: categories.length,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parent: c.parent,
      count: c.count,
      link: c.link,
    })),
  };
  fs.writeFileSync(path.join(root, "src/data/ralex-categories.json"), `${JSON.stringify(out, null, 2)}\n`);
  console.log("Updated src/data/ralex-categories.json");
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await pool.end();
}
