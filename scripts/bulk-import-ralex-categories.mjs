#!/usr/bin/env node
/**
 * Volledige Ralex productimport via de lokale Next-admin-API.
 * Vereist: draaiende `npm run dev`, geldige `.env.local` met ADMIN_PASSWORD (en server met ADMIN_JWT_SECRET).
 *
 *   npm run import:ralex-bulk
 *   BULK_IMPORT_BASE=http://127.0.0.1:3060 npm run import:ralex-bulk
 *
 * Opnieuw alles (ook als categorieën al “compleet” gemarkeerd zijn), bv. na nieuwe importlogica:
 *   BULK_IMPORT_FORCE=1 npm run import:ralex-bulk
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

function isComplete(c) {
  if (!c.importCompletedAt || c.importedProductCount === undefined) return false;
  if (c.count === 0) return c.importedProductCount === 0;
  return c.importedProductCount >= c.count;
}

function flattenTree(nodes) {
  const out = [];
  const walk = (n) => {
    out.push(n);
    for (const ch of n.children ?? []) walk(ch);
  };
  for (const r of nodes) walk(r);
  return out;
}

function log(...a) {
  console.log(new Date().toISOString().slice(11, 19), ...a);
}

loadEnv();

const BASE = process.env.BULK_IMPORT_BASE || "http://127.0.0.1:3060";
const password = process.env.ADMIN_PASSWORD;
const FORCE =
  process.env.BULK_IMPORT_FORCE === "1" ||
  process.env.BULK_IMPORT_FORCE === "true" ||
  process.argv.includes("--force");
if (!password || password.length < 8) {
  console.error("Zet ADMIN_PASSWORD (min. 8 tekens) in .env.local");
  process.exit(1);
}

const noStore = { credentials: "include", cache: "no-store" };

function cookieHeaderFromResponse(res) {
  if (typeof res.headers.getSetCookie === "function") {
    const all = res.headers.getSetCookie();
    if (all?.length) {
      return all.map((c) => c.split(";")[0]).join("; ");
    }
  }
  const single = res.headers.get("set-cookie");
  if (single) {
    return single
      .split(/,(?=[^,;=]+=[^,;=]+)/)
      .map((p) => p.trim().split(";")[0])
      .join("; ");
  }
  return "";
}

async function login() {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
    ...noStore,
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(`Login ${res.status}: ${j.error || res.statusText}`);
  }
  const cookie = cookieHeaderFromResponse(res);
  if (!cookie) {
    throw new Error("Geen Set-Cookie na login (controleer BASE-URL en admin-config).");
  }
  return cookie;
}

async function getCategories(cookie) {
  const res = await fetch(`${BASE}/api/admin/categories`, {
    headers: { Cookie: cookie },
    ...noStore,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GET categories ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

async function importCategory(cookie, id) {
  const res = await fetch(`${BASE}/api/admin/categories/${id}/import-products`, {
    method: "POST",
    headers: { Cookie: cookie },
    ...noStore,
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function reconcile(cookie) {
  const res = await fetch(`${BASE}/api/admin/categories/reconcile-markers`, {
    method: "POST",
    headers: { Cookie: cookie },
    ...noStore,
  });
  return res.ok;
}

async function main() {
  log("Login…");
  const cookie = await login();

  if (FORCE) {
    log("FORCE: reconcile overgeslagen — eenmalige volledige her-import van alle categorie-ID's.");
    const data = await getCategories(cookie);
    const flat = flattenTree(data.tree);
    const byId = new Map();
    for (const n of flat) {
      if (!byId.has(n.id)) {
        byId.set(n.id, n);
      }
    }
    const unique = [...byId.values()];
    log(`${unique.length} unieke categorieën.`);
    const errorSkip = new Set();
    for (const node of unique) {
      const label = (node.name || "").replace(/^\*\s*/, "").trim();
      log(`  → ${node.id} ${label} (${node.count} prod.)`);
      const { ok, status, body } = await importCategory(cookie, node.id);
      if (!ok) {
        log(`  FOUT ${node.id}: ${body.error || status}`);
        errorSkip.add(node.id);
        continue;
      }
      log(`  ✓ ${node.id}: ${body.imported ?? "?"} producten, importComplete=${body.importComplete}`);
    }
    log("FORCE afgerond.");
    return;
  }

  log("Reconcile markers…");
  await reconcile(cookie);

  const errorSkip = new Set();
  const maxRounds = 80;

  for (let round = 1; round <= maxRounds; round++) {
    const data = await getCategories(cookie);
    const batch = flattenTree(data.tree).filter((n) => !isComplete(n) && !errorSkip.has(n.id));
    if (batch.length === 0) {
      log("Klaar: geen incomplete categorieën meer.");
      break;
    }
    const idsAtRoundStart = new Set(batch.map((n) => n.id));
    log(`Ronde ${round}: ${batch.length} categorie(ën)`);

    for (const node of batch) {
      const label = (node.name || "").replace(/^\*\s*/, "").trim();
      log(`  → ${node.id} ${label} (${node.count} prod.)`);
      const { ok, status, body } = await importCategory(cookie, node.id);
      if (!ok) {
        log(`  FOUT ${node.id}: ${body.error || status}`);
        errorSkip.add(node.id);
        continue;
      }
      log(`  ✓ ${node.id}: ${body.imported ?? "?"} producten, importComplete=${body.importComplete}`);

      await getCategories(cookie);
    }

    const after = await getCategories(cookie);
    const afterBatch = flattenTree(after.tree).filter((n) => !isComplete(n) && !errorSkip.has(n.id));
    const sameIds =
      afterBatch.length === batch.length &&
      afterBatch.every((n) => idsAtRoundStart.has(n.id)) &&
      batch.every((b) => afterBatch.some((n) => n.id === b.id));
    if (sameIds) {
      log("Stop: geen vooruitgang in deze ronde (zelfde incomplete set).");
      break;
    }
  }

  log("Afgerond.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
