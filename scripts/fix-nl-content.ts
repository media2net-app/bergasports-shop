/**
 * NL-content opschonen na Engelse Woo/WP-import:
 * - producttitels (maten, GRX, kleuren, cycling shoes, …)
 * - nieuws: Uncategorized/news → Nieuws + bekende Engelse titels vertalen
 *
 *   npx tsx scripts/fix-nl-content.ts
 *   npx tsx scripts/fix-nl-content.ts --dry-run
 */
import fs from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient, type Prisma } from "../src/generated/prisma/client.ts";
import { decodeImportedProductTitle, type TrendyolJsonProduct } from "../src/lib/products.ts";
import { normalizeNewsCategoryNl } from "../src/lib/news-format.ts";

const root = path.resolve(import.meta.dirname, "..");

const NEWS_TITLE_FIXES: Record<
  string,
  { title: string; excerpt: string; category?: string }
> = {
  "the-first-nimbl-x-etoile-drop-is-almost-sold-out-pre-order-yours-now": {
    title: "De eerste Nimbl x Étoile-collectie is bijna uitverkocht",
    excerpt: "Pre-order nu — de eerste Nimbl x Étoile-drop is bijna weg. Bestel snel via Bergasports.",
    category: "Nimbl",
  },
  "nimbl-x-nike-etoile-cycling-shoes-available-now-bergasports": {
    title: "Nimbl x Nike Étoile wielrenschoenen nu verkrijgbaar",
    excerpt: "Exclusieve performance, Italiaans vakmanschap — direct uit voorraad bij Bergasports.",
    category: "Nimbl",
  },
  "nimbl-x-nike-etoile-cycling-shoes-clothing-pre-order-now-at-bergasports": {
    title: "Nimbl x Nike Étoile: schoenen en kleding — pre-order bij Bergasports",
    excerpt: "De exclusieve Nimbl x Nike Étoile-collectie: pre-order nu bij Bergasports in Dedemsvaart.",
    category: "Nimbl",
  },
  "tour-de-france-deals-at-bergasports-premium-road-bikes-in-dedemsvaart": {
    title: "Tour de France-deals bij Bergasports: premium racefietsen in Dedemsvaart",
    excerpt: "Profiteer van Tour de France-deals op premium racefietsen bij Bergasports.",
    category: "Nieuws",
  },
  "new-in-stock-custom-orbea-oiz-xl": {
    title: "Nieuw op voorraad: custom Orbea Oiz XL",
    excerpt: "Op zoek naar iets unieks? Deze custom Orbea Oiz XL staat klaar in Dedemsvaart.",
    category: "Nieuws",
  },
  "scope-artech-r6-a-and-r8-t-extensively-tested-by-bergasports": {
    title: "Scope Artech R6.A en R8.T — uitgebreid getest door Bergasports",
    excerpt: "De Scope Artech R6.A en R8.T zijn intensief getest door Bergasports.",
    category: "Nieuws",
  },
  "tubeless-banden-monteren-op-je-racefiets-een-stappenplan": {
    title: "Tubeless banden monteren op je racefiets: een stappenplan",
    excerpt:
      "Stap je over naar tubeless op de racefiets? Ontdek in dit stappenplan hoe je zelf tubeless banden monteert.",
    category: "Tips",
  },
};

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

async function main() {
  const env = { ...loadEnv(), ...process.env };
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL ontbreekt");

  const dryRun = process.argv.includes("--dry-run");
  const isLocal = /localhost|127\.0\.0\.1/i.test(databaseUrl);
  const connectionString = databaseUrl
    .replace(/[?&]sslmode=[^&]*/g, "")
    .replace(/[?&]$/, "");
  const pool = new pg.Pool({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    let productsChanged = 0;
    const products = await prisma.product.findMany({ select: { id: true, name: true, data: true } });
    for (const row of products) {
      const data = row.data as TrendyolJsonProduct;
      const rawName = row.name || data.name || "";
      const nextName = decodeImportedProductTitle(rawName);
      if (!nextName || nextName === rawName) continue;
      productsChanged += 1;
      console.log(`product ${row.id}: ${rawName.slice(0, 70)} → ${nextName.slice(0, 70)}`);
      if (dryRun) continue;
      await prisma.product.update({
        where: { id: row.id },
        data: {
          name: nextName,
          data: { ...data, name: nextName, id: Number(row.id) } as Prisma.InputJsonValue,
        },
      });
    }

    let newsChanged = 0;
    const news = await prisma.newsPost.findMany({
      select: { id: true, slug: true, title: true, excerpt: true, category: true },
    });
    for (const row of news) {
      const fix = NEWS_TITLE_FIXES[row.slug];
      const nextCategory = normalizeNewsCategoryNl(row.category);
      const nextTitle = fix?.title ?? row.title;
      const nextExcerpt = fix?.excerpt ?? row.excerpt;
      const categoryOut = fix?.category ?? nextCategory;
      const changed =
        nextTitle !== row.title ||
        (nextExcerpt || null) !== (row.excerpt || null) ||
        categoryOut !== row.category;
      if (!changed) continue;
      newsChanged += 1;
      console.log(`news ${row.slug}: [${row.category}] → [${categoryOut}] · ${nextTitle.slice(0, 60)}`);
      if (dryRun) continue;
      await prisma.newsPost.update({
        where: { id: row.id },
        data: {
          title: nextTitle,
          excerpt: nextExcerpt,
          category: categoryOut,
        },
      });
    }

    console.log(
      dryRun
        ? `Dry-run: ${productsChanged} producten, ${newsChanged} nieuwsberichten`
        : `Klaar: ${productsChanged} producten, ${newsChanged} nieuwsberichten bijgewerkt`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
