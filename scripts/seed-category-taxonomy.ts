/**
 * Zet de publieke categorie-IA (CTA/SEO-taxonomie) in de database:
 * - Ouders: glasses → accessories, scope-outlet → wheels, used-bikes → bikes
 * - Schoenen & kleding (schoenen-kleding) als top, met Fietsschoenen + Kleding
 * - Producten van legacy lafuga-kleding / wielrenschoenen-v2 → juiste subcats
 * - NL public slugs + SEO-copy
 *
 * Run: npm run cat:taxonomy
 * (of: npx tsx scripts/seed-category-taxonomy.ts)
 *
 * Aanbevolen volgorde op andere envs:
 *   npm run cat:skeelers && npm run cat:taxonomy
 */
import fs from "node:fs";
import path from "node:path";

import pg from "pg";

import { categoryCopyForSlug } from "../src/lib/category-copy";
import { categorySeoDefaults } from "../src/lib/category-meta";
import { WC_TO_NL_SLUG } from "../src/lib/category-slugs";

const root = path.resolve(import.meta.dirname, "..");

const SHOES_CLOTHING_ID = 100010;
const SHOES_CLOTHING_SLUG = "schoenen-kleding";

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

/** child WC slug → parent WC slug (0 = top). */
const PARENT_BY_SLUG: Record<string, string | null> = {
  glasses: "accessories",
  "scope-outlet": "wheels",
  "used-bikes": "bikes",
  "cycling-shoes": SHOES_CLOTHING_SLUG,
  "lafuga-wear": SHOES_CLOTHING_SLUG,
  [SHOES_CLOTHING_SLUG]: null,
  "road-bike": "bikes",
  gravelbike: "bikes",
  mtb: "bikes",
  "cycling-helmets": "accessories",
  cleats: "accessories",
  "group-sets": "accessories",
  "complete-skates": "speed-skates",
  "skate-shoes": "speed-skates",
  "skate-wheels": "speed-skates",
  "skate-bearings": "speed-skates",
};

const SEO_SLUGS = [
  "bikes",
  "road-bike",
  "gravelbike",
  "mtb",
  "used-bikes",
  "speed-skates",
  "complete-skates",
  "skate-shoes",
  "skate-wheels",
  "skate-bearings",
  "wheels",
  "scope-outlet",
  SHOES_CLOTHING_SLUG,
  "cycling-shoes",
  "lafuga-wear",
  "accessories",
  "glasses",
  "cycling-helmets",
  "cleats",
  "group-sets",
] as const;

type ProductRow = {
  id: string;
  name: string;
  category: string | null;
  data: Record<string, unknown> | null;
};

function asWcList(data: Record<string, unknown> | null): { id: number; name: string; slug: string }[] {
  const raw = data?.wcCategories;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = row as { id?: number; name?: string; slug?: string };
      return {
        id: Number(r.id) || 0,
        name: String(r.name ?? ""),
        slug: String(r.slug ?? "").toLowerCase(),
      };
    })
    .filter((r) => r.slug);
}

async function ensureShoesClothingParent(
  client: pg.Client,
  idBySlug: Map<string, number>,
): Promise<number> {
  const existing = idBySlug.get(SHOES_CLOTHING_SLUG);
  if (existing) {
    await client.query(
      `UPDATE categories SET parent_id = 0, name = $2, link = $3, updated_at = NOW() WHERE id = $1`,
      [existing, "Schoenen & kleding", "/schoenen-kleding"],
    );
    return existing;
  }

  const meta = categorySeoDefaults(SHOES_CLOTHING_SLUG);
  const nl = categoryCopyForSlug(SHOES_CLOTHING_SLUG, "nl");
  const en = categoryCopyForSlug(SHOES_CLOTHING_SLUG, "en");
  await client.query(
    `INSERT INTO categories (
       id, name, slug, parent_id, product_count, link,
       seo_intro, seo_meta_title, seo_meta_description, translations, updated_at
     ) VALUES ($1, $2, $3, 0, 0, $4, $5, $6, $7, $8::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       slug = EXCLUDED.slug,
       parent_id = 0,
       link = EXCLUDED.link,
       updated_at = NOW()`,
    [
      SHOES_CLOTHING_ID,
      meta?.name ?? "Schoenen & kleding",
      SHOES_CLOTHING_SLUG,
      "/schoenen-kleding",
      nl?.intro ?? null,
      meta?.seoTitle ?? null,
      nl?.seoDescription ?? null,
      JSON.stringify({
        nl: {
          name: meta?.name ?? "Schoenen & kleding",
          slug: "schoenen-kleding",
          description: nl?.intro ?? "",
          seoDescription: nl?.seoDescription ?? "",
        },
        en: {
          name: "Shoes & apparel",
          slug: "schoenen-kleding",
          description: en?.intro ?? "",
          seoDescription: en?.seoDescription ?? "",
        },
      }),
    ],
  );
  idBySlug.set(SHOES_CLOTHING_SLUG, SHOES_CLOTHING_ID);
  console.log(`Created parent ${SHOES_CLOTHING_SLUG} (id ${SHOES_CLOTHING_ID})`);
  return SHOES_CLOTHING_ID;
}

/** Verplaats producten van legacy Woo-cats naar Fietsschoenen / Kleding. */
async function assignProductsToSubs(client: pg.Client, idBySlug: Map<string, number>) {
  const shoesId = idBySlug.get("cycling-shoes");
  const wearId = idBySlug.get("lafuga-wear");
  if (!shoesId || !wearId) {
    console.log("Skip product-assign: cycling-shoes of lafuga-wear ontbreekt");
    return;
  }

  const { rows } = await client.query<ProductRow>(
    `SELECT id::text AS id, name, category, data
       FROM products
      WHERE category ILIKE '%schoen%'
         OR category ILIKE '%kleding%'
         OR category ILIKE '%clothing%'
         OR category ILIKE '%nimbl%'
         OR brand ILIKE '%nimbl%'
         OR brand ILIKE '%lafuga%'
         OR data::text ILIKE '%lafuga-kleding%'
         OR data::text ILIKE '%wielrenschoenen-v2%'
         OR data::text ILIKE '%cycling-shoes%'
         OR data::text ILIKE '%lafuga-wear%'`,
  );

  let toShoes = 0;
  let toWear = 0;
  let skippedSkate = 0;

  for (const row of rows) {
    const data = (row.data && typeof row.data === "object" ? row.data : {}) as Record<
      string,
      unknown
    >;
    const wc = asWcList(data);
    const cat = (row.category ?? "").toLowerCase();
    const hay = `${row.name} ${cat} ${wc.map((c) => c.slug).join(" ")}`.toLowerCase();

    // Skeelerschoenen horen onder skeelers, niet hier.
    if (
      cat.includes("skeeler") ||
      wc.some((c) => c.slug === "speed-skates" || c.slug.startsWith("skate-"))
    ) {
      skippedSkate += 1;
      continue;
    }

    const isShoe =
      wc.some((c) =>
        ["cycling-shoes", "wielrenschoenen", "wielrenschoenen-v2", "fietsschoenen"].includes(
          c.slug,
        ),
      ) ||
      cat.includes("fietsschoen") ||
      cat.includes("wielrenschoen") ||
      /cycling.?shoe|fietsschoen|wielrenschoen|gravel.?schoen/.test(hay);

    const isApparel =
      wc.some((c) =>
        ["lafuga-wear", "lafuga-kleding", "lafuga-collectie", "kleding"].includes(c.slug),
      ) ||
      cat.includes("kleding") ||
      cat.includes("clothing") ||
      /jersey|bibshort|bib.?short|koerspet|t-shirt|shirt|jack|broek|windstopper|therm/.test(
        hay,
      );

    let target: { id: number; name: string; slug: string; label: string } | null = null;
    if (isShoe && !isApparel) {
      target = { id: shoesId, name: "Fietsschoenen", slug: "cycling-shoes", label: "Fietsschoenen" };
    } else if (isApparel && !isShoe) {
      target = { id: wearId, name: "Kleding", slug: "lafuga-wear", label: "Kleding" };
    } else if (isShoe) {
      // Zowel schoen- als kleding-signalen: prefer schoen als productnaam schoen is
      target = /schoen|shoe|boot/.test(hay)
        ? { id: shoesId, name: "Fietsschoenen", slug: "cycling-shoes", label: "Fietsschoenen" }
        : { id: wearId, name: "Kleding", slug: "lafuga-wear", label: "Kleding" };
    } else {
      continue;
    }

    const nextWc = [
      { id: target.id, name: target.name, slug: target.slug },
      ...wc.filter(
        (c) =>
          ![
            "lafuga-kleding",
            "lafuga-collectie",
            "wielrenschoenen-v2",
            "cycling-shoes",
            "lafuga-wear",
            "kleding",
            "fietsschoenen",
            "wielrenschoenen",
          ].includes(c.slug),
      ),
    ];
    // Houd target eerst
    const dedup = new Map<string, (typeof nextWc)[0]>();
    for (const c of nextWc) dedup.set(c.slug, c);
    const finalWc = [
      { id: target.id, name: target.name, slug: target.slug },
      ...[...dedup.values()].filter((c) => c.slug !== target!.slug),
    ];

    const nextData = { ...data, wcCategories: finalWc };
    await client.query(
      `UPDATE products
          SET category = $2,
              data = $3::jsonb,
              updated_at = NOW()
        WHERE id = $1`,
      [row.id, target.label, JSON.stringify(nextData)],
    );
    if (target.slug === "cycling-shoes") toShoes += 1;
    else toWear += 1;
  }

  console.log(
    `Products assigned — fietsschoenen ${toShoes}, kleding ${toWear}, skeeler overgeslagen ${skippedSkate}`,
  );
}

async function refreshCounts(client: pg.Client, idBySlug: Map<string, number>) {
  const shoesId = idBySlug.get("cycling-shoes");
  const wearId = idBySlug.get("lafuga-wear");
  const parentId = idBySlug.get(SHOES_CLOTHING_SLUG);
  if (!shoesId || !wearId || !parentId) return;

  const countFor = async (slug: string, label: string) => {
    const r = await client.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM products
        WHERE category = $1
           OR data::text ILIKE $2`,
      [label, `%"slug": "${slug}"%`],
    );
    return Number(r.rows[0]?.n ?? 0);
  };

  const shoesN = await countFor("cycling-shoes", "Fietsschoenen");
  const wearN = await countFor("lafuga-wear", "Kleding");
  await client.query(`UPDATE categories SET product_count = $2, updated_at = NOW() WHERE id = $1`, [
    shoesId,
    shoesN,
  ]);
  await client.query(`UPDATE categories SET product_count = $2, updated_at = NOW() WHERE id = $1`, [
    wearId,
    wearN,
  ]);
  await client.query(`UPDATE categories SET product_count = $2, updated_at = NOW() WHERE id = $1`, [
    parentId,
    shoesN + wearN,
  ]);
  console.log(`Counts — fietsschoenen ${shoesN}, kleding ${wearN}, parent ${shoesN + wearN}`);
}

async function main() {
  const env = { ...loadEnv(), ...process.env };
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL ontbreekt in .env.local");
  }
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  try {
    const { rows: cats } = await client.query<{ id: number; slug: string }>(
      `SELECT id, slug FROM categories`,
    );
    const idBySlug = new Map(cats.map((c) => [c.slug.trim().toLowerCase(), c.id]));

    await ensureShoesClothingParent(client, idBySlug);

    for (const [childSlug, parentSlug] of Object.entries(PARENT_BY_SLUG)) {
      const childId = idBySlug.get(childSlug);
      if (!childId) {
        console.log(`Skip reparent ${childSlug} (niet in DB)`);
        continue;
      }
      const parentId = parentSlug ? (idBySlug.get(parentSlug) ?? null) : null;
      if (parentSlug && parentId == null) {
        console.log(`Skip reparent ${childSlug} → ${parentSlug} (ouder ontbreekt)`);
        continue;
      }
      await client.query(
        `UPDATE categories SET parent_id = $2, updated_at = NOW() WHERE id = $1`,
        [childId, parentId ?? 0],
      );
      console.log(`Parent ${childSlug} → ${parentSlug ?? "(top)"}`);
    }

    await assignProductsToSubs(client, idBySlug);
    await refreshCounts(client, idBySlug);

    for (const slug of SEO_SLUGS) {
      const id = idBySlug.get(slug);
      if (!id) continue;
      const nl = categoryCopyForSlug(slug, "nl");
      const en = categoryCopyForSlug(slug, "en");
      const meta = categorySeoDefaults(slug);
      if (!nl || !en || !meta) continue;

      const publicNl = WC_TO_NL_SLUG[slug] ?? slug;
      const row = await client.query<{ seo_intro: string | null; translations: unknown }>(
        `SELECT seo_intro, translations FROM categories WHERE id = $1`,
        [id],
      );
      const existingIntro = row.rows[0]?.seo_intro?.trim() || "";
      const looksEnglish =
        existingIntro &&
        /\b(the|and|with|your|for|from|this|that)\b/i.test(existingIntro) &&
        !/\b(de|het|een|van|voor|bij|met)\b/i.test(existingIntro.slice(0, 100));
      const prev = (row.rows[0]?.translations && typeof row.rows[0].translations === "object"
        ? (row.rows[0].translations as Record<string, unknown>)
        : {}) as Record<string, Record<string, string>>;

      const translations = {
        ...prev,
        nl: {
          ...(prev.nl ?? {}),
          name: meta.name,
          slug: publicNl,
          description: nl.intro,
          seoDescription: nl.seoDescription,
        },
        en: {
          ...(prev.en ?? {}),
          description: looksEnglish ? existingIntro : en.intro,
          seoDescription: en.seoDescription,
        },
      };

      await client.query(
        `UPDATE categories
            SET name = $2,
                link = $3,
                seo_intro = $4,
                seo_footer_html = NULL,
                seo_meta_title = $5,
                seo_meta_description = $6,
                translations = $7::jsonb,
                updated_at = NOW()
          WHERE id = $1`,
        [
          id,
          meta.name,
          `/${publicNl}`,
          nl.intro,
          meta.seoTitle,
          nl.seoDescription,
          JSON.stringify(translations),
        ],
      );
      console.log(`SEO short+long ${slug} → /${publicNl} (${meta.name})`);
    }

    console.log("Klaar: categorie-taxonomie CTA/SEO (short + long).");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
