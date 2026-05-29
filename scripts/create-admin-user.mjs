/**
 * Maakt of werkt een admin-gebruiker bij in Prisma Postgres (admin_users).
 * Usage: node scripts/create-admin-user.mjs <email> <password> [--super-admin]
 */
import fs from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");

function loadEnvFile(filename) {
  const p = path.join(root, filename);
  if (!fs.existsSync(p)) {
    return {};
  }
  const env = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 64;

function hashAdminPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN, SCRYPT);
  return `scrypt:${salt.toString("base64")}:${hash.toString("base64")}`;
}

const email = process.argv[2]?.trim().toLowerCase();
const password = process.argv[3];
const superAdmin = process.argv.includes("--super-admin");
if (!email || !password) {
  console.error("Usage: node scripts/create-admin-user.mjs <email> <password> [--super-admin]");
  process.exit(1);
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL in .env or .env.local");
  process.exit(1);
}

const role = superAdmin ? "super_admin" : "admin";
const passwordHash = hashAdminPassword(password);
const pool = new pg.Pool({ connectionString: databaseUrl });

try {
  await pool.query(
    `INSERT INTO admin_users (email, password_hash, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
    [email, passwordHash, role],
  );
  console.log(`Admin user ready: ${email} (${role})`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await pool.end();
}
