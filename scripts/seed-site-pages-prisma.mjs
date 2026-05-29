/**
 * Seed CMS pages into Prisma Postgres.
 * Run: node scripts/seed-site-pages-prisma.mjs
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");

function loadEnv() {
  const merged = {};
  for (const file of [".env", ".env.local"]) {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) continue;
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
      merged[t.slice(0, eq).trim()] = value;
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

const legalPages = [
  {
    slug: "about",
    path: "/despre-noi",
    title: "Over ons | Bergasports",
    heading: "Over ons",
    meta_title: "Over ons | Bergasports",
    meta_description:
      "Bergasports — webshop voor racefietsen, wielrenschoenen, wielen en accessoires in Dedemsvaart.",
    sort_order: 10,
    body_html:
      "<p><strong>Bergasports</strong> is meer dan een winkel — je sportpartner in Dedemsvaart.</p>",
  },
  {
    slug: "contact",
    path: "/contact",
    title: "Contact | Bergasports",
    heading: "Contact",
    meta_title: "Contact | Bergasports",
    meta_description: "Neem contact op met Bergasports.",
    sort_order: 20,
    body_html:
      "<p>E-mail: <a href=\"mailto:info@bergasports.com\">info@bergasports.com</a></p><p>Julianastraat 3A, 7701 GH Dedemsvaart</p>",
  },
];

async function upsertPage(client, page) {
  await client.query(
    `INSERT INTO site_pages (
      slug, path, title, heading, body_html, blocks, meta_title, meta_description,
      is_published, sort_order, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,NOW())
    ON CONFLICT (slug) DO UPDATE SET
      path = EXCLUDED.path,
      title = EXCLUDED.title,
      heading = EXCLUDED.heading,
      body_html = EXCLUDED.body_html,
      blocks = EXCLUDED.blocks,
      meta_title = EXCLUDED.meta_title,
      meta_description = EXCLUDED.meta_description,
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
      page.sort_order ?? 0,
    ],
  );
  console.log("Seeded:", page.slug, page.path);
}

async function main() {
  const env = loadEnv();
  const url = env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL ontbreekt in .env / .env.local");
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  await upsertPage(client, {
    slug: "home",
    path: "/",
    title: "Homepage",
    heading: null,
    body_html: "",
    blocks: homepageBlocks,
    sort_order: 0,
  });

  for (const page of legalPages) {
    await upsertPage(client, { ...page, blocks: null });
  }

  await client.end();
  console.log("Done — site pages in Prisma Postgres.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
