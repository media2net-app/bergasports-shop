/**
 * Maak of werk een adminaccount bij (tabel admin_users).
 * Run: npm run admin:user -- <e-mail> [wachtwoord] [admin|super_admin]
 *
 * Zonder wachtwoord genereert het script er een en print die één keer.
 */
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

import pg from "pg";

import { hashAdminPassword } from "../src/lib/admin-password-hash.ts";

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

function generatePassword(): string {
  return randomBytes(12).toString("base64url");
}

async function main() {
  const [emailArg, passwordArg, roleArg] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("Gebruik: npm run admin:user -- <e-mail> [wachtwoord] [admin|super_admin]");
    process.exit(1);
  }
  const role = roleArg === "admin" ? "admin" : "super_admin";
  const password = passwordArg?.trim() || generatePassword();
  if (password.length < 8) {
    console.error("Wachtwoord moet minimaal 8 tekens zijn.");
    process.exit(1);
  }

  const env = { ...loadEnv(), ...process.env };
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL ontbreekt in .env.local");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO admin_users (email, password_hash, role, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
      [email, hashAdminPassword(password), role],
    );
    console.log(`Adminaccount klaar: ${email} (${role})`);
    if (!passwordArg) {
      console.log(`Wachtwoord: ${password}`);
      console.log("Bewaar dit wachtwoord; het wordt niet opnieuw getoond.");
    }
    console.log("Inloggen op http://localhost:3060/admin/login");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
