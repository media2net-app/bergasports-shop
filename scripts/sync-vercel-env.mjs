#!/usr/bin/env node
/**
 * Sync .env.local → Vercel (production, preview, development).
 * Usage: node scripts/sync-vercel-env.mjs [--scope media2net-apps-projects]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");

if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const scopeArg = process.argv.includes("--scope")
  ? ["--scope", process.argv[process.argv.indexOf("--scope") + 1]]
  : [];

function parseEnvFile(content) {
  const out = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const vars = parseEnvFile(fs.readFileSync(envPath, "utf8"));
const environments = ["production", "preview", "development"];
let ok = 0;
let fail = 0;

for (const [key, value] of Object.entries(vars)) {
  if (!value) {
    console.log(`skip ${key} (empty)`);
    continue;
  }
  const sensitive = /SECRET|PASSWORD|PASS|TOKEN|KEY|DATABASE_URL/i.test(key);
  for (const env of environments) {
    const args = [
      "env",
      "add",
      key,
      env,
      "--value",
      value,
      "--yes",
      ...(sensitive ? ["--sensitive"] : []),
      ...scopeArg,
    ];
    const r = spawnSync("vercel", args, { cwd: root, encoding: "utf8" });
    if (r.status === 0) {
      ok += 1;
      console.log(`+ ${key} → ${env}`);
    } else if ((r.stderr || r.stdout || "").includes("already exists")) {
      const forceArgs = [...args, "--force"];
      const r2 = spawnSync("vercel", forceArgs, { cwd: root, encoding: "utf8" });
      if (r2.status === 0) {
        ok += 1;
        console.log(`~ ${key} → ${env} (updated)`);
      } else {
        fail += 1;
        console.error(`! ${key} → ${env}:`, (r2.stderr || r2.stdout || "").trim());
      }
    } else {
      fail += 1;
      console.error(`! ${key} → ${env}:`, (r.stderr || r.stdout || "").trim());
    }
  }
}

console.log(`Done: ${ok} ok, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
