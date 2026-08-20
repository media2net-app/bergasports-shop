/**
 * Zet echte fabrikantmerken op producten (Orbea, Nimbl, …).
 * Bergasports is de winkel, geen productmerk.
 *
 *   npx tsx scripts/fix-brands.ts
 */
import fs from "node:fs";
import path from "node:path";

import pg from "pg";

import {
  brandSlugFromName,
  inferProductBrandName,
  isShopNameBrand,
  KNOWN_PRODUCT_BRANDS,
} from "../src/lib/brands-shared.ts";

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

type ProductRow = {
  id: string;
  name: string | null;
  brand: string | null;
  brand_id: number | null;
  category: string | null;
  data: Record<string, unknown>;
};

async function main() {
  const env = { ...loadEnv(), ...process.env };
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL ontbreekt in .env.local");
  }
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `update public.brands
       set visible = false, updated_at = now()
       where lower(regexp_replace(trim(name), '\\s+', ' ', 'g')) in ('bergasports', 'berga sports')
          or slug in ('bergasports', 'berga-sports')`,
    );

    for (const brand of KNOWN_PRODUCT_BRANDS) {
      const slug = brandSlugFromName(brand.name);
      if (!slug) continue;
      await client.query(
        `insert into public.brands (name, slug, visible, sort_order)
         values ($1, $2, true, $3)
         on conflict (slug) do update set
           name = excluded.name,
           visible = true,
           sort_order = excluded.sort_order,
           updated_at = now()`,
        [brand.name, slug, brand.sortOrder],
      );
    }

    const brandRows = await client.query<{ id: number; name: string; slug: string }>(
      `select id, name, slug from public.brands`,
    );
    const bySlug = new Map(brandRows.rows.map((row) => [row.slug, row]));

    const products = await client.query<ProductRow>(
      `select id::text, name, brand, brand_id, category, data from public.products`,
    );

    const counts = new Map<string, number>();
    let assigned = 0;
    let cleared = 0;

    for (const row of products.rows) {
      const data = (row.data ?? {}) as Record<string, unknown>;
      const inferred = inferProductBrandName({
        brand: isShopNameBrand(row.brand) ? undefined : row.brand,
        name: row.name ?? (typeof data.name === "string" ? data.name : undefined),
        category: row.category ?? (typeof data.category === "string" ? data.category : undefined),
        specsText: typeof data.specsText === "string" ? data.specsText : undefined,
        wcAttributes: Array.isArray(data.wcAttributes) ? (data.wcAttributes as never) : undefined,
        attributes: Array.isArray(data.attributes) ? (data.attributes as never) : undefined,
        wcCategories: Array.isArray(data.wcCategories) ? (data.wcCategories as never) : undefined,
        tags: Array.isArray(data.tags) ? (data.tags as never) : undefined,
      });

      if (!inferred) {
        const nextData = { ...data };
        delete nextData.brand;
        delete nextData.brandId;
        await client.query(
          `update public.products
           set brand = null,
               brand_id = null,
               data = $2::jsonb,
               updated_at = now()
           where id = $1`,
          [row.id, JSON.stringify(nextData)],
        );
        cleared += 1;
        counts.set("(geen merk)", (counts.get("(geen merk)") ?? 0) + 1);
        continue;
      }

      const slug = brandSlugFromName(inferred);
      let brand = bySlug.get(slug);
      if (!brand) {
        const created = await client.query<{ id: number; name: string; slug: string }>(
          `insert into public.brands (name, slug, visible, sort_order)
           values ($1, $2, true, 300)
           on conflict (slug) do update set name = excluded.name, visible = true, updated_at = now()
           returning id, name, slug`,
          [inferred, slug],
        );
        brand = created.rows[0];
        bySlug.set(slug, brand);
      }

      const nextData = { ...data, brand: brand.name, brandId: brand.id };
      await client.query(
        `update public.products
         set brand = $2,
             brand_id = $3,
             data = $4::jsonb,
             updated_at = now()
         where id = $1`,
        [row.id, brand.name, brand.id, JSON.stringify(nextData)],
      );
      assigned += 1;
      counts.set(brand.name, (counts.get(brand.name) ?? 0) + 1);
    }

    await client.query("COMMIT");

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nl"));
    console.log(`Klaar: ${assigned} producten gekoppeld, ${cleared} zonder merk.`);
    console.log("Producten per merk:");
    for (const [name, n] of sorted) {
      console.log(`  ${n}\t${name}`);
    }
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
