/**
 * Exporteer SEO-redirects voor hosting/DNS (Nginx, Vercel, Cloudflare).
 *
 *   npx tsx scripts/export-seo-redirects.ts
 *
 * Schrijft docs/migration/redirect-map.generated.json
 */
import fs from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient } from "../src/generated/prisma/client.ts";
import { nextConfigSeoRedirects, STATIC_EXACT_SEO_REDIRECTS } from "../src/lib/seo-redirects-static.ts";

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
  const rows: { source: string; destination: string; statusCode: number; kind: string }[] = nextConfigSeoRedirects().map(
    (row) => ({ ...row, kind: "static" }),
  );
  const seen = new Set(rows.map((row) => row.source));

  if (env.DATABASE_URL) {
    const isLocal = /localhost|127\.0\.0\.1/i.test(env.DATABASE_URL);
    const pool = new pg.Pool(
      isLocal
        ? { connectionString: env.DATABASE_URL, max: 1 }
        : { connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 },
    );
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    try {
      const dbRows = await prisma.seoRedirect.findMany({
        where: { enabled: true },
        select: { sourcePath: true, destinationPath: true, statusCode: true, kind: true },
        orderBy: { sourcePath: "asc" },
      });
      for (const row of dbRows) {
        if (seen.has(row.sourcePath)) continue;
        seen.add(row.sourcePath);
        rows.push({
          source: row.sourcePath,
          destination: row.destinationPath,
          statusCode: row.statusCode,
          kind: row.kind,
        });
      }
    } catch (e) {
      console.warn("Database-redirects overgeslagen:", e instanceof Error ? e.message : e);
    } finally {
      await prisma.$disconnect();
    }
  }

  const out = {
    version: 2,
    notes:
      "301-mapping voor cutover. Pad-only. Host/DNS (.nl vs .com, www) blijft hosting. Gegenereerd door scripts/export-seo-redirects.ts.",
    redirects: rows,
    staticExactCount: Object.keys(STATIC_EXACT_SEO_REDIRECTS).length,
  };
  const dest = path.join(root, "docs/migration/redirect-map.generated.json");
  fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Geschreven: ${dest} (${rows.length} redirects)`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
