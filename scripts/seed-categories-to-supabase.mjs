/**
 * Eenmalig: importeert src/data/ralex-categories.json naar Supabase (categories + catalog_meta).
 * node scripts/seed-categories-to-supabase.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(import.meta.dirname, "..");

function loadEnv() {
  const p = path.join(root, ".env.local");
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

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(path.join(root, "src/data/ralex-categories.json"), "utf8"));
const supabase = createClient(url, key, { auth: { persistSession: false } });

await supabase.from("catalog_meta").upsert({
  id: 1,
  source: raw.source,
  source_api: raw.sourceApi,
  fetched_at: raw.fetchedAt,
  updated_at: new Date().toISOString(),
});

const rows = raw.categories.map((c) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  parent_id: c.parent,
  product_count: c.count,
  link: c.link || null,
  import_completed_at: c.importCompletedAt ?? null,
  imported_product_count: c.importedProductCount ?? null,
  updated_at: new Date().toISOString(),
}));

const { error } = await supabase.from("categories").upsert(rows, { onConflict: "id" });
if (error) {
  console.error(error);
  process.exit(1);
}
console.log(`Seeded ${rows.length} categories + catalog_meta`);
