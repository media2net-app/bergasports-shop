/**
 * Importeer producten, klanten, orders, nieuws en pagina's van bergasports.com (WPML)
 * naar deze shop. bergasports.nl heeft geen /wp-json — .nl-URL's worden herschreven naar
 * www.bergasports.com?lang=nl.
 *
 *   npx tsx scripts/import-wordpress.ts
 *   npx tsx scripts/import-wordpress.ts --dry-run
 *   npx tsx scripts/import-wordpress.ts --only=news,pages
 *   npx tsx scripts/import-wordpress.ts --base-url=https://www.bergasports.com --locale=nl --only=products
 *   npx tsx scripts/import-wordpress.ts --base-url=https://www.bergasports.com --locale=en --only=products
 *
 * Taal: --locale=nl|en (of automatisch: .nl→nl, .com→en). NL → primaire velden; EN → translations.en.
 * Credentials: WC_STORE_BASE_URL + WC_CONSUMER_KEY + WC_CONSUMER_SECRET
 * (env of /admin/settings/woocommerce). Nieuws/pagina's: publieke WP REST.
 * Optioneel WP_APP_USER / WP_APP_PASSWORD — nooit de Woo ck_/cs_ daarvoor.
 */
import fs from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient } from "../src/generated/prisma/client.ts";
import { runWordpressImport } from "../src/lib/wordpress-import-run.ts";
import {
  normalizeWpBaseUrl,
  parseImportTypes,
  resolveWordpressImportLocale,
  WORDPRESS_IMPORT_TYPES,
  wordpressRestBaseUrl,
  wpAuthFromEnv,
  type WordpressImportCredentials,
  type WordpressImportType,
} from "../src/lib/wordpress-import-shared.ts";

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

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function createPrisma(databaseUrl: string): PrismaClient {
  const isLocal = /localhost|127\.0\.0\.1/i.test(databaseUrl);
  const connectionString = databaseUrl
    .replace(/([?&])sslmode=[^&]*/gi, "$1")
    .replace(/[?&]$/, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "");
  const pool = new pg.Pool(
    isLocal
      ? { connectionString, max: 2 }
      : {
          connectionString,
          ssl: { rejectUnauthorized: false },
          max: 1,
        },
  );
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

async function resolveCredentials(prisma: PrismaClient, env: Record<string, string>): Promise<WordpressImportCredentials> {
  let key = env.WC_CONSUMER_KEY?.trim() || "";
  let secret = env.WC_CONSUMER_SECRET?.trim() || "";
  let baseUrl = normalizeWpBaseUrl(env.WC_STORE_BASE_URL || "https://www.bergasports.com");
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: ["WC_CONSUMER_KEY", "WC_CONSUMER_SECRET", "WC_STORE_BASE_URL"] } },
      select: { key: true, value: true },
    });
    const db = new Map(rows.map((row) => [row.key, row.value.trim()]));
    key = db.get("WC_CONSUMER_KEY") || key;
    secret = db.get("WC_CONSUMER_SECRET") || secret;
    baseUrl = normalizeWpBaseUrl(db.get("WC_STORE_BASE_URL") || baseUrl);
  } catch {
    /* site_settings ontbreekt nog — val terug op env */
  }
  return {
    baseUrl,
    auth: key && secret ? { key, secret } : null,
    wpAuth: wpAuthFromEnv(env),
  };
}

function printHelp() {
  console.log(`Gebruik:
  npx tsx scripts/import-wordpress.ts
  npx tsx scripts/import-wordpress.ts --dry-run
  npx tsx scripts/import-wordpress.ts --only=${WORDPRESS_IMPORT_TYPES.join(",")}
  npx tsx scripts/import-wordpress.ts --base-url=https://www.bergasports.com --locale=nl --only=products
  npx tsx scripts/import-wordpress.ts --base-url=https://www.bergasports.com --locale=en --only=products

Types: ${WORDPRESS_IMPORT_TYPES.join(", ")}
REST: altijd www.bergasports.com (WPML). .nl-URL → .com + ?lang=nl.
Taal: --locale=nl|en, of automatisch (.nl→nl, .com→en)
Sleutels: WooCommerce REST (ck_/cs_) in .env.local of /admin/settings/woocommerce.
Nieuws/pagina's: publieke WP REST. Optioneel WP_APP_USER / WP_APP_PASSWORD (geen Woo-sleutels).`);
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const env = { ...loadEnv(), ...process.env };
  for (const [key, value] of Object.entries(loadEnv())) {
    if (!process.env[key]) process.env[key] = value;
  }

  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL ontbreekt in .env / .env.local");
  }

  const onlyRaw = argValue("only");
  const types: WordpressImportType[] = onlyRaw
    ? parseImportTypes(onlyRaw.split(",").map((s) => s.trim()))
    : [...WORDPRESS_IMPORT_TYPES];
  const dryRun = process.argv.includes("--dry-run");
  const maxPagesRaw = Number(argValue("max-pages") || "0");
  const maxPages = Number.isFinite(maxPagesRaw) && maxPagesRaw > 0 ? maxPagesRaw : undefined;

  const prisma = createPrisma(databaseUrl);
  try {
    const creds = await resolveCredentials(prisma, env);
    const baseOverride = argValue("base-url");
    if (baseOverride?.trim()) {
      creds.baseUrl = normalizeWpBaseUrl(baseOverride);
    }
    const locale = resolveWordpressImportLocale(argValue("locale"), creds.baseUrl);
    console.log(`Bron: ${creds.baseUrl}`);
    console.log(`REST-API: ${wordpressRestBaseUrl(creds.baseUrl)} · lang=${locale}`);
    console.log(
      `Taal: ${locale} (${locale === "nl" ? "primaire velden + translations.nl" : `translations.${locale}, NL blijft staan`})`,
    );
    console.log(`Woo REST: ${creds.auth ? "sleutels aanwezig" : "geen sleutels (alleen nieuws/pagina's)"}`);
    console.log(
      `WP REST: ${creds.wpAuth ? "application password" : "publiek (geen Woo-sleutels op /wp/v2)"}`,
    );
    console.log(`Types: ${types.join(", ")}${dryRun ? " · dry-run" : ""}`);

    const result = await runWordpressImport(prisma, creds, {
      types,
      dryRun,
      maxPages,
      locale,
      log: (message) => console.log(message),
    });

    for (const type of types) {
      const row = result[type];
      if (!row) continue;
      console.log(
        `${type}: ${row.fetched} opgehaald, ${row.created} nieuw, ${row.updated} bijgewerkt, ${row.skipped} overgeslagen (${row.pages} pagina's)`,
      );
    }
    if (result.redirects) {
      const row = result.redirects;
      console.log(
        `redirects: ${row.created} nieuw, ${row.updated} bijgewerkt, ${row.skipped} overgeslagen`,
      );
    }
    for (const err of Object.values(result.errors)) {
      console.error(err);
    }
    for (const warning of result.warnings) {
      console.warn(warning);
    }
    const failed = Object.keys(result.errors);
    console.log(dryRun ? "Dry-run klaar — niets opgeslagen." : "Import klaar.");
    if (failed.length) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
