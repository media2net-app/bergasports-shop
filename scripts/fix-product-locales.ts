/**
 * Herstel producten waarbij Engelse Woo-teksten in de NL-primary velden staan.
 * Kopieert die teksten naar translations.en en wist omschrijvingen uit NL-primary.
 *
 *   npx tsx scripts/fix-product-locales.ts
 *   npx tsx scripts/fix-product-locales.ts --dry-run
 */
import fs from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient } from "../src/generated/prisma/client.ts";
import type { TrendyolJsonProduct } from "../src/lib/products.ts";
import { repairProductPrimaryEnglishContamination } from "../src/lib/wordpress-import-shared.ts";

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

async function main() {
  const env = { ...loadEnv(), ...process.env };
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL ontbreekt");

  const dryRun = process.argv.includes("--dry-run");
  const isLocal = /localhost|127\.0\.0\.1/i.test(databaseUrl);
  const connectionString = databaseUrl
    .replace(/([?&])sslmode=[^&]*/gi, "$1")
    .replace(/[?&]$/, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "");
  const pool = new pg.Pool(
    isLocal
      ? { connectionString, max: 2 }
      : { connectionString, ssl: { rejectUnauthorized: false }, max: 1 },
  );
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const rows = await prisma.product.findMany({ select: { id: true, data: true, name: true } });
    let moved = 0;
    let skipped = 0;

    for (const row of rows) {
      const data = { ...(row.data as TrendyolJsonProduct), id: Number(row.id), name: row.name ?? (row.data as TrendyolJsonProduct).name };
      const result = repairProductPrimaryEnglishContamination(data);
      if (!result.movedToEn) {
        skipped += 1;
        continue;
      }
      moved += 1;
      if (dryRun) {
        console.log(`Would fix #${row.id}: ${data.name ?? "(geen naam)"}`);
        continue;
      }
      await prisma.product.update({
        where: { id: row.id },
        data: {
          data: result.product as object,
          // naam blijft staan tot NL-herimport
        },
      });
    }

    console.log(
      dryRun
        ? `Dry-run: ${moved} producten zouden EN krijgen, ${skipped} overgeslagen`
        : `Klaar: ${moved} producten → translations.en, ${skipped} overgeslagen`,
    );
    console.log("Daarna: npm run import:wordpress -- --base-url=https://www.bergasports.nl --only=products");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
