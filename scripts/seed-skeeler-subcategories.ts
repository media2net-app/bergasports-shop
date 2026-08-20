/**
 * Maakt skeeler-subcategorieën aan, zet NL/EN category-copy, en wijst producten toe.
 * Run: npx tsx scripts/seed-skeeler-subcategories.ts
 */
import fs from "node:fs";
import path from "node:path";

import pg from "pg";

import { categoryCopyForSlug } from "../src/lib/category-copy";

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

type SkateKind = "complete-skates" | "skate-shoes" | "skate-wheels" | "skate-bearings" | null;

const SUBS: {
  slug: string;
  name: string;
  enName: string;
}[] = [
  { slug: "complete-skates", name: "Complete skeelers", enName: "Complete skates" },
  { slug: "skate-shoes", name: "Schoenen", enName: "Skate shoes" },
  { slug: "skate-wheels", name: "Skeelerwielen", enName: "Skate wheels" },
  { slug: "skate-bearings", name: "Lagers", enName: "Bearings" },
];

/** Product category label stored on products (must stay unique vs bike "Wielen"). */
const PRODUCT_CATEGORY_LABEL: Record<string, string> = {
  "complete-skates": "Complete skeelers",
  "skate-shoes": "Skeelerschoenen",
  "skate-wheels": "Skeelerwielen",
  "skate-bearings": "Lagers",
};

function classifySkate(name: string, slug: string): SkateKind {
  const hay = `${name} ${slug}`.toLowerCase();
  if (/bearing|lager|ball.?bearing|ceramic.?7/.test(hay)) return "skate-bearings";
  if (/package|complete.?skeeler|g1.?skates|complete.?skate/.test(hay)) return "complete-skates";
  if (/frame/.test(hay)) return null; // frames blijven op ouder
  if (/wheel|wielen|wiel/.test(hay)) return "skate-wheels";
  if (/shoe|boot|schoen/.test(hay)) return "skate-shoes";
  return null;
}

function isSkateProduct(category: string | null, data: Record<string, unknown>): boolean {
  const cat = (category ?? "").toLowerCase();
  if (cat.includes("skeeler") || cat.includes("skate")) return true;
  const wc = data.wcCategories;
  if (Array.isArray(wc)) {
    for (const row of wc) {
      const slug = String((row as { slug?: string }).slug ?? "").toLowerCase();
      if (slug === "speed-skates" || slug === "skeelers" || slug.startsWith("skate-")) return true;
    }
  }
  return false;
}

async function main() {
  const env = { ...loadEnv(), ...process.env };
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL ontbreekt in .env.local");
  }
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  try {
    const parent = await client.query<{ id: number }>(
      `SELECT id FROM categories WHERE slug = 'speed-skates' LIMIT 1`,
    );
    if (!parent.rows[0]) {
      throw new Error("Categorie speed-skates niet gevonden.");
    }
    const parentId = parent.rows[0].id;

    const maxIdRes = await client.query<{ max: number | null }>(
      `SELECT MAX(id)::int AS max FROM categories`,
    );
    let nextId = Math.max((maxIdRes.rows[0]?.max ?? 0) + 1, 100_000);

    const idBySlug = new Map<string, number>();

    for (const sub of SUBS) {
      const existing = await client.query<{ id: number }>(
        `SELECT id FROM categories WHERE slug = $1 LIMIT 1`,
        [sub.slug],
      );
      const nl = categoryCopyForSlug(sub.slug, "nl");
      const en = categoryCopyForSlug(sub.slug, "en");
      const translations = {
        nl: {
          name: sub.name,
          slug: sub.slug === "complete-skates" ? "complete-skeelers" : sub.slug.replace("skate-", "skeeler-").replace("bearings", "lagers").replace("shoes", "schoenen").replace("wheels", "wielen"),
          description: nl?.intro ?? "",
          seoDescription: nl?.seoDescription ?? "",
        },
        en: {
          name: sub.enName,
          slug: sub.slug,
          description: en?.intro ?? "",
          seoDescription: en?.seoDescription ?? "",
        },
      };
      // Fix NL public slugs to match category-slugs.ts
      if (sub.slug === "skate-bearings") translations.nl.slug = "skeeler-lagers";
      if (sub.slug === "skate-shoes") translations.nl.slug = "skeeler-schoenen";
      if (sub.slug === "skate-wheels") translations.nl.slug = "skeeler-wielen";
      if (sub.slug === "complete-skates") translations.nl.slug = "complete-skeelers";

      if (existing.rows[0]) {
        idBySlug.set(sub.slug, existing.rows[0].id);
        await client.query(
          `UPDATE categories
              SET name = $2,
                  parent_id = $3,
                  seo_intro = $4,
                  seo_meta_description = $5,
                  translations = COALESCE(translations, '{}'::jsonb) || $6::jsonb,
                  updated_at = NOW()
            WHERE id = $1`,
          [
            existing.rows[0].id,
            sub.name,
            parentId,
            nl?.intro ?? null,
            nl?.seoDescription ?? null,
            JSON.stringify(translations),
          ],
        );
        console.log(`Updated subcategory ${sub.slug} (#${existing.rows[0].id})`);
      } else {
        const id = nextId++;
        idBySlug.set(sub.slug, id);
        await client.query(
          `INSERT INTO categories (
             id, name, slug, parent_id, product_count, link,
             seo_intro, seo_meta_description, translations, updated_at
           ) VALUES (
             $1, $2, $3, $4, 0, $5, $6, $7, $8::jsonb, NOW()
           )`,
          [
            id,
            sub.name,
            sub.slug,
            parentId,
            `/${sub.slug}`,
            nl?.intro ?? null,
            nl?.seoDescription ?? null,
            JSON.stringify(translations),
          ],
        );
        console.log(`Created subcategory ${sub.slug} (#${id})`);
      }
    }

    // Seed NL intros for main categories (move EN Woo text to translations.en when needed)
    const mainSlugs = [
      "bikes",
      "road-bike",
      "gravelbike",
      "mtb",
      "speed-skates",
      "wheels",
      "scope-outlet",
      "cycling-shoes",
      "accessories",
      "glasses",
      "cycling-helmets",
    ];
    for (const slug of mainSlugs) {
      const nl = categoryCopyForSlug(slug, "nl");
      const en = categoryCopyForSlug(slug, "en");
      if (!nl || !en) continue;
      const row = await client.query<{ seo_intro: string | null; translations: unknown }>(
        `SELECT seo_intro, translations FROM categories WHERE slug = $1 LIMIT 1`,
        [slug],
      );
      if (!row.rows[0]) continue;
      const existingIntro = row.rows[0].seo_intro?.trim() || "";
      const looksEnglish =
        existingIntro &&
        /\b(the|and|with|your|for|from|this|that)\b/i.test(existingIntro) &&
        !/\b(de|het|een|van|voor|bij|met)\b/i.test(existingIntro.slice(0, 100));
      const prev = (row.rows[0].translations && typeof row.rows[0].translations === "object"
        ? (row.rows[0].translations as Record<string, unknown>)
        : {}) as Record<string, Record<string, string>>;
      const nextTranslations = {
        ...prev,
        nl: {
          ...(prev.nl ?? {}),
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
            SET seo_intro = $2,
                seo_meta_description = $3,
                translations = $4::jsonb,
                updated_at = NOW()
          WHERE slug = $1`,
        [slug, nl.intro, nl.seoDescription, JSON.stringify(nextTranslations)],
      );
      console.log(`Seeded copy for ${slug}`);
    }

    const { rows: products } = await client.query<{
      id: string;
      name: string | null;
      category: string | null;
      data: Record<string, unknown>;
    }>(`SELECT id::text, name, category, data FROM products`);

    const counts: Record<string, number> = {
      "complete-skates": 0,
      "skate-shoes": 0,
      "skate-wheels": 0,
      "skate-bearings": 0,
      parent: 0,
      skipped: 0,
    };

    for (const row of products) {
      if (!isSkateProduct(row.category, row.data)) {
        counts.skipped += 1;
        continue;
      }
      const name = row.name ?? String(row.data.name ?? "");
      const slug = String(row.data.slug ?? row.data.wcSlug ?? "");
      const kind = classifySkate(name, slug);
      if (!kind) {
        counts.parent += 1;
        continue;
      }

      const catId = idBySlug.get(kind);
      if (!catId) {
        counts.parent += 1;
        continue;
      }

      const label = PRODUCT_CATEGORY_LABEL[kind];
      const subMeta = SUBS.find((s) => s.slug === kind)!;
      const data = { ...row.data, category: label };
      const prevWc = Array.isArray(data.wcCategories)
        ? (data.wcCategories as { id: number; name: string; slug: string }[])
        : [];
      const withoutDup = prevWc.filter(
        (c) => c.slug !== kind && c.slug !== "skeelers" && c.slug !== "speed-skates",
      );
      data.wcCategories = [
        { id: parentId, name: "Skeelers", slug: "speed-skates" },
        { id: catId, name: subMeta.name, slug: kind },
        ...withoutDup,
      ];

      await client.query(
        `UPDATE products
            SET category = $2,
                data = $3::jsonb,
                updated_at = NOW()
          WHERE id = $1`,
        [row.id, label, JSON.stringify(data)],
      );
      counts[kind] += 1;
    }

    // Refresh product_count on subcats + parent
    for (const sub of SUBS) {
      const id = idBySlug.get(sub.slug);
      if (!id) continue;
      const label = PRODUCT_CATEGORY_LABEL[sub.slug];
      const n = await client.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM products
          WHERE category = $1
             OR data->'wcCategories' @> $2::jsonb`,
        [label, JSON.stringify([{ slug: sub.slug }])],
      );
      await client.query(`UPDATE categories SET product_count = $2, updated_at = NOW() WHERE id = $1`, [
        id,
        Number(n.rows[0]?.c ?? 0),
      ]);
    }

    console.log(
      `Products — complete ${counts["complete-skates"]}, schoenen ${counts["skate-shoes"]}, wielen ${counts["skate-wheels"]}, lagers ${counts["skate-bearings"]}, parent-only ${counts.parent}, overig ${counts.skipped}.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
