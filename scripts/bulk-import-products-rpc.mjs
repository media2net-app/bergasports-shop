/**
 * Eenmalige bulk-import via tijdelijke RPC `import_product_batch` (SECURITY DEFINER).
 * Gebruikt NEXT_PUBLIC_* keys uit .env.local — daarna RPC weer droppen.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function loadEnvLocal() {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) {
    throw new Error("Geen .env.local");
  }
  const lines = fs.readFileSync(p, "utf8").split("\n");
  const out = {};
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) {
      continue;
    }
    const eq = t.indexOf("=");
    if (eq === -1) {
      continue;
    }
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL of NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ontbreekt in .env.local");
}

const raw = fs.readFileSync(path.join(ROOT, "src/data/trendyol-products.json"), "utf8");
const db = JSON.parse(raw);
const products = db.products;

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BATCH = 35;
let total = 0;

for (let i = 0; i < products.length; i += BATCH) {
  const chunk = products.slice(i, i + BATCH);
  const { data, error } = await supabase.rpc("import_product_batch", { payload: chunk });
  if (error) {
    console.error(JSON.stringify({ i, error }, null, 2));
    process.exit(1);
  }
  total += Number(data) || 0;
  process.stderr.write(`\r${Math.min(i + BATCH, products.length)} / ${products.length}`);
}

console.log(`\nimport_product_batch: ${total} rijen verwerkt (catalogus: ${products.length} producten)`);
