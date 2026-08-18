/**
 * Seed / refresh de CMS-pagina's in Postgres.
 * Run: npm run seed:site-pages
 *
 * De teksten komen uit src/lib/legal-site-pages-content.ts — dat is de enige bron.
 * De homepage wordt alleen aangemaakt als hij nog niet bestaat, zodat hero-teksten
 * die via de admin zijn aangepast blijven staan.
 */
import fs from "node:fs";
import path from "node:path";

import pg from "pg";

import {
  legalSitePagesSeed,
  retiredSitePageSlugs,
} from "../src/lib/legal-site-pages-content.ts";

const root = path.resolve(import.meta.dirname, "..");

function loadEnv(): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const file of [".env", ".env.local"]) {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))
      ) {
        value = value.slice(1, -1);
      }
      merged[trimmed.slice(0, eq).trim()] = value;
    }
  }
  return merged;
}

const homepageBlocks = {
  hero: {
    eyebrow: "Bergasports · Dedemsvaart",
    title: "Meer dan een winkel,\nje sportpartner.",
    subtitle: "Bij Bergasports draait alles om prestaties, kwaliteit en persoonlijke service.",
    ctaShop: "Bekijk onze producten",
    ctaOffers: "Mijn verhaal",
  },
};

type SeedPage = {
  slug: string;
  path: string;
  title: string;
  heading?: string | null;
  body_html?: string;
  blocks?: unknown;
  meta_title?: string | null;
  meta_description?: string | null;
  social_image?: string | null;
  image_alt?: string | null;
  sort_order?: number;
};

async function upsertPage(client: pg.Client, page: SeedPage) {
  await client.query(
    `INSERT INTO site_pages (
      slug, path, title, heading, body_html, blocks, meta_title, meta_description,
      social_image, image_alt, is_published, sort_order, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,NOW())
    ON CONFLICT (slug) DO UPDATE SET
      path = EXCLUDED.path,
      title = EXCLUDED.title,
      heading = EXCLUDED.heading,
      body_html = EXCLUDED.body_html,
      blocks = EXCLUDED.blocks,
      meta_title = EXCLUDED.meta_title,
      meta_description = EXCLUDED.meta_description,
      social_image = EXCLUDED.social_image,
      image_alt = EXCLUDED.image_alt,
      is_published = EXCLUDED.is_published,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()`,
    [
      page.slug,
      page.path,
      page.title,
      page.heading ?? null,
      page.body_html ?? "",
      page.blocks ? JSON.stringify(page.blocks) : null,
      page.meta_title ?? null,
      page.meta_description ?? null,
      page.social_image ?? null,
      page.image_alt ?? null,
      page.sort_order ?? 0,
    ],
  );
  console.log("Geseed:", page.slug, page.path);
}

async function main() {
  const env = loadEnv();
  const url = process.env.DATABASE_URL || env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL ontbreekt in .env / .env.local");
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  const home = await client.query(
    `INSERT INTO site_pages (slug, path, title, heading, body_html, blocks, is_published, sort_order, updated_at)
     VALUES ('home', '/', 'Homepage', NULL, '', $1, true, 0, NOW())
     ON CONFLICT (slug) DO NOTHING`,
    [JSON.stringify(homepageBlocks)],
  );
  console.log(home.rowCount ? "Geseed: home /" : "Overgeslagen: home / (bestaat al)");

  for (const page of legalSitePagesSeed) {
    await upsertPage(client, { ...page, blocks: null });
  }

  if (retiredSitePageSlugs.length > 0) {
    const retired = await client.query(
      `UPDATE site_pages SET is_published = false, updated_at = NOW()
       WHERE slug = ANY($1::text[]) AND is_published = true`,
      [[...retiredSitePageSlugs]],
    );
    if (retired.rowCount) {
      console.log(`Gearchiveerd: ${retired.rowCount} verouderde pagina('s)`);
    }
  }

  await client.end();
  console.log(`Klaar — ${legalSitePagesSeed.length} CMS-pagina's bijgewerkt.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
