/**
 * Seed / refresh CMS legal & info pages (Task C).
 * Run: npx tsx scripts/seed-site-pages.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import { legalSitePagesSeed } from "../src/lib/legal-site-pages-content.ts";

const root = path.resolve(import.meta.dirname, "..");

function loadEnv() {
  const p = path.join(root, ".env.local");
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

const homepageBlocks = {
  hero: {
    eyebrow: "Colectie noua",
    title: "Bine ai venit la E-Store House",
    subtitle:
      "Descopera produse populare si selectii pentru casa, cadouri si uz zilnit. Servicii de incredere si livrare rapida.",
    ctaShop: "Magazinul",
    ctaOffers: "Vezi ofertele",
    promoLabel: "Saptamana aceasta",
    promoTitle: "Reducere de 20%",
    promoText: "La pachete selectate din categoria Casa.",
  },
};

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env in .env.local");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const homeRow = {
    slug: "home",
    path: "/",
    title: "Homepage",
    heading: null,
    body_html: "",
    blocks: homepageBlocks,
    sort_order: 0,
    is_published: true,
    updated_at: new Date().toISOString(),
  };

  const { error: homeErr } = await supabase.from("site_pages").upsert(homeRow, { onConflict: "slug" });
  if (homeErr) {
    throw new Error(homeErr.message);
  }
  console.log("Seeded: home /");

  for (const page of legalSitePagesSeed) {
    const { error } = await supabase.from("site_pages").upsert(
      {
        slug: page.slug,
        path: page.path,
        title: page.title,
        heading: page.heading,
        body_html: page.body_html,
        meta_title: page.meta_title,
        meta_description: page.meta_description,
        blocks: null,
        sort_order: page.sort_order,
        is_published: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    );
    if (error) {
      throw new Error(`${page.slug}: ${error.message}`);
    }
    console.log("Seeded:", page.slug, page.path);
  }

  console.log("Done — legal pages updated.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
