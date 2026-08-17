/**
 * Spiegelt alle productafbeeldingen naar public/product-images via admin API.
 * Vereist: dev server op BASE_URL + ADMIN_JWT_SECRET
 */
import fs from "node:fs";
import path from "node:path";
import { SignJWT } from "jose";

const root = path.resolve(import.meta.dirname, "..");

function loadEnvFile(filename) {
  const p = path.join(root, filename);
  if (!fs.existsSync(p)) return {};
  const env = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let value = t.slice(eq + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    env[t.slice(0, eq).trim()] = value;
  }
  return env;
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
const secret = env.ADMIN_JWT_SECRET;
const baseUrl = (process.env.BASE_URL || "http://localhost:3060").replace(/\/$/, "");

if (!secret || secret.length < 16) {
  console.error("ADMIN_JWT_SECRET ontbreekt");
  process.exit(1);
}

const key = new TextEncoder().encode(secret);
const token = await new SignJWT({ role: "super_admin" })
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("12h")
  .setIssuedAt()
  .sign(key);

const LIMIT = 25;
let offset = 0;
let totalProcessed = 0;
let totalUpdated = 0;
let totalMirrored = 0;
const allErrors = [];

console.log(`Mirror images via ${baseUrl}/api/admin/products/migrate-images\n`);

for (;;) {
  const res = await fetch(`${baseUrl}/api/admin/products/migrate-images`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `admin_session=${token}`,
    },
    body: JSON.stringify({ offset, limit: LIMIT }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Batch offset=${offset} failed:`, body.error || res.status);
    process.exit(1);
  }

  totalProcessed += body.processed ?? 0;
  totalUpdated += body.updated ?? 0;
  totalMirrored += body.mirrored ?? 0;
  if (body.errors?.length) {
    allErrors.push(...body.errors);
  }

  console.log(
    `offset ${offset}: processed ${body.processed}, updated ${body.updated}, mirrored ${body.mirrored} urls`,
  );

  if (!body.processed || body.processed < LIMIT) {
    break;
  }
  offset = body.nextOffset ?? offset + LIMIT;
  await new Promise((r) => setTimeout(r, 300));
}

console.log(
  `\nKlaar: ${totalProcessed} producten, ${totalUpdated} bijgewerkt, ${totalMirrored} afbeeldingen gespiegeld.`,
);
if (allErrors.length) {
  console.log(`Fouten (${allErrors.length}):`);
  for (const e of allErrors.slice(0, 15)) {
    console.log(`  ${e}`);
  }
}
