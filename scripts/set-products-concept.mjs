/**
 * Set productStatus = concept (hidden on shop) for given IDs.
 * Usage: node scripts/set-products-concept.mjs 62987 63045 ...
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_IDS = [62987, 63045, 107975, 108091, 108386];

function loadEnv() {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) throw new Error("Geen .env.local");
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

const ids = process.argv.slice(2).map((s) => Number(s)).filter((n) => n > 0);
const targetIds = ids.length ? ids : DEFAULT_IDS;

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

for (const id of targetIds) {
  const { data, error: fetchErr } = await supabase.from("products").select("id, data").eq("id", id).maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!data) {
    console.log(`skip #${id} — not found`);
    continue;
  }
  const product = { ...data.data, id: data.data?.id ?? data.id };
  const next = {
    ...product,
    productStatus: "concept",
    featuredOnHomepage: false,
  };
  const { error } = await supabase
    .from("products")
    .update({
      data: next,
      featured_on_homepage: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`#${id}: ${error.message}`);
  console.log(`#${id} → concept`);
}

console.log(`Done. ${targetIds.length} product(s) set to concept.`);
