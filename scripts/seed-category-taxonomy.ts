/**
 * Zet de publieke categorie-IA (CTA/SEO-taxonomie) in de database:
 * - Ouders: glasses → accessories, scope-outlet → wheels, used-bikes → bikes
 * - Schoenen (cycling-shoes) + Kleding (lafuga-wear) blijven topniveau
 * - NL public slug kleding + SEO-copy voor alle hoofdcategorieën
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
  "cycling-shoes": null,
  "lafuga-wear": null,
  "road-bike": "bikes",
  gravelbike: "bikes",
  mtb: "bikes",
  "cycling-helmets": "accessories",
  cleats: "accessories",
  "group-sets": "accessories",
};

const SEO_SLUGS = [
  "bikes",
  "road-bike",
  "gravelbike",
  "mtb",
  "speed-skates",
  "wheels",
  "scope-outlet",
  "cycling-shoes",
  "lafuga-wear",
  "accessories",
  "glasses",
  "cycling-helmets",
  "cleats",
  "group-sets",
  "used-bikes",
] as const;

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
      console.log(`SEO/copy ${slug} → /${publicNl} (${meta.name})`);
    }

    console.log("Klaar: categorie-taxonomie CTA/SEO.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
