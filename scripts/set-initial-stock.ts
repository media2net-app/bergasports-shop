/**
 * Zet een startvoorraad op producten die nog geen aantal hebben.
 * Run: npm run stock:init            (standaard 5 stuks)
 *      npm run stock:init -- 10      (10 stuks)
 *      npm run stock:init -- 5 --all (ook producten die al een aantal hebben overschrijven)
 *
 * Zonder --all blijven bestaande aantallen staan, zodat je handmatige correcties
 * in de admin niet kwijtraakt.
 */
import fs from "node:fs";
import path from "node:path";

import pg from "pg";

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
  const args = process.argv.slice(2);
  const overwrite = args.includes("--all");
  const quantityArg = args.find((a) => !a.startsWith("--"));
  const quantity = Number.parseInt(quantityArg ?? "5", 10);
  if (!Number.isFinite(quantity) || quantity < 0) {
    console.error("Gebruik: npm run stock:init -- <aantal> [--all]");
    process.exit(1);
  }

  const env = { ...loadEnv(), ...process.env };
  if (!env.DATABASE_URL) {
    console.error("DATABASE_URL ontbreekt in .env.local");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    const where = overwrite
      ? ""
      : `WHERE data->'stockQuantity' IS NULL OR jsonb_typeof(data->'stockQuantity') <> 'number'`;
    const res = await client.query(
      `UPDATE products
         SET data = jsonb_set(
               jsonb_set(data, '{stockQuantity}', to_jsonb($1::int), true),
               '{inStock}', to_jsonb($2::boolean), true
             ),
             updated_at = NOW()
       ${where}`,
      [quantity, quantity > 0],
    );
    console.log(
      `${res.rowCount} product(en) op ${quantity} stuks gezet${overwrite ? " (alles overschreven)" : " (alleen zonder aantal)"}.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
