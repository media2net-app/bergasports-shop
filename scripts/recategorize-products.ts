/**
 * Koppel producten aan de juiste subcategorie (WooCommerce-namen uit de import).
 * Run: npm run cat:assign
 *
 * - Fietsen op "Bikes"/"Fietsen" → Racefietsen / Gravel / MTB
 * - KASK-helmen op "Accessories"/"Accessoires" → Helmen
 * - Testproduct in "Shop" → concept (niet in de shop)
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

function classifyBike(name: string): "Racefietsen" | "Gravel" | "MTB" {
  const n = name.toLowerCase();
  if (/\b(mtb|mountain|hardtail|full suspension|alma|oiz|syncline)\b/i.test(n)) {
    return "MTB";
  }
  if (/\b(gravel|terra|palta|g4-?x|relii|denna)\b/i.test(n)) {
    return "Gravel";
  }
  return "Racefietsen";
}

function isHelmet(name: string): boolean {
  return /\b(kask|helmet|helm)\b/i.test(name);
}

function isTestProduct(name: string): boolean {
  return /test product/i.test(name);
}

async function main() {
  const env = { ...loadEnv(), ...process.env };
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL ontbreekt in .env.local");
  }
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{
      id: string;
      name: string | null;
      category: string | null;
      data: Record<string, unknown>;
    }>(`SELECT id::text, name, category, data FROM products`);

    const counts = { road: 0, gravel: 0, mtb: 0, helmets: 0, concept: 0, skipped: 0 };

    for (const row of rows) {
      const name = row.name ?? String(row.data.name ?? "");
      const current = row.category ?? String(row.data.category ?? "");
      let nextCategory: string | null = null;
      let concept = false;

      if (isTestProduct(name) || current === "Shop") {
        concept = true;
      } else if (current === "Bikes" || current === "Fietsen") {
        nextCategory = classifyBike(name);
      } else if ((current === "Accessories" || current === "Accessoires") && isHelmet(name)) {
        nextCategory = "Helmen";
      }

      if (!nextCategory && !concept) {
        counts.skipped += 1;
        continue;
      }

      let data = { ...row.data };
      if (nextCategory) {
        data = { ...data, category: nextCategory };
      }
      if (concept) {
        data = { ...data, productStatus: "concept" };
      }

      await client.query(
        `UPDATE products
            SET category = COALESCE($2, category),
                data = $3::jsonb,
                updated_at = NOW()
          WHERE id = $1`,
        [row.id, nextCategory, JSON.stringify(data)],
      );

      if (concept) counts.concept += 1;
      if (nextCategory === "Racefietsen") counts.road += 1;
      if (nextCategory === "Gravel") counts.gravel += 1;
      if (nextCategory === "MTB") counts.mtb += 1;
      if (nextCategory === "Helmen") counts.helmets += 1;
    }

    console.log(
      `Klaar — race ${counts.road}, gravel ${counts.gravel}, mtb ${counts.mtb}, helmen ${counts.helmets}, concept ${counts.concept}, ongewijzigd ${counts.skipped}.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
