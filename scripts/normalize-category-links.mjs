/**
 * Rewrite categories.link to internal shop paths (/{slug}).
 *
 * Usage: node scripts/normalize-category-links.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXCLUDED = new Set(["bumbac"]);

function loadEnv() {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) {
    throw new Error("Geen .env.local");
  }
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

function shopHref(slug) {
  const s = slug.trim().toLowerCase();
  if (!s || EXCLUDED.has(s)) {
    return "/shop";
  }
  return `/${s}`;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY vereist");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.from("categories").select("id, slug, link");
  if (error) {
    throw new Error(error.message);
  }

  let updated = 0;
  let already = 0;
  for (const row of data ?? []) {
    const next = shopHref(row.slug);
    if (row.link === next) {
      already += 1;
      continue;
    }
    const { error: upErr } = await supabase
      .from("categories")
      .update({ link: next, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (upErr) {
      throw new Error(`#${row.id}: ${upErr.message}`);
    }
    updated += 1;
    console.log(`  #${row.id} ${row.slug} → ${next}`);
  }

  await supabase.from("catalog_meta").upsert({
    id: 1,
    source: "https://www.estorehouse.ro/",
    source_api: "E-Store House catalog (Supabase)",
    updated_at: new Date().toISOString(),
  });

  console.log(`Done. Updated: ${updated}, already internal: ${already}, total: ${data?.length ?? 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
