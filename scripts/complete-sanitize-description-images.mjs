/**
 * Finish description image sanitization: mirror remaining externals, then strip
 * any <img> that still points off-platform (404 / unreachable).
 *
 * Usage: node scripts/complete-sanitize-description-images.mjs
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");
const BUCKET = "product-images";
const IMG_ATTR_RES = [/\bsrc\s*=\s*["']([^"']+)["']/gi, /\bdata-src\s*=\s*["']([^"']+)["']/gi];

function loadEnv() {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) throw new Error("Geen .env.local");
  const env = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

function normalizeFetchUrl(url) {
  const t = url?.trim();
  if (!t) return "";
  if (t.startsWith("//")) return `https:${t}`;
  if (t.startsWith("http://")) return `https://${t.slice(7)}`;
  return t;
}

function isHosted(url, supabaseHost) {
  try {
    const u = new URL(url.trim());
    return (
      u.hostname.toLowerCase() === supabaseHost.toLowerCase() &&
      u.pathname.includes(`/storage/v1/object/public/${BUCKET}/`)
    );
  } catch {
    return false;
  }
}

function countExternalDescriptionProducts(supabase, supabaseHost) {
  return (async () => {
    let withExt = 0;
    let from = 0;
    const pageSize = 500;
    while (true) {
      const { data, error } = await supabase
        .from("products")
        .select("data")
        .order("id")
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      for (const row of data) {
        let productBad = false;
        for (const key of ["wcShortDescriptionHtml", "wcDescriptionHtml"]) {
          const html = row.data?.[key];
          if (typeof html !== "string" || !html.trim()) continue;
          const tagRe = /<img\b[^>]*>/gi;
          let tag;
          while ((tag = tagRe.exec(html)) !== null) {
            for (const re of IMG_ATTR_RES) {
              re.lastIndex = 0;
              let m;
              while ((m = re.exec(tag[0])) !== null) {
                const norm = normalizeFetchUrl(m[1]);
                if (norm && /^https:\/\//i.test(norm) && !isHosted(norm, supabaseHost)) {
                  productBad = true;
                  break;
                }
              }
              if (productBad) break;
            }
            if (productBad) break;
          }
          if (productBad) break;
        }
        if (productBad) withExt += 1;
      }
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return withExt;
  })();
}

function runNodeScript(script, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [path.join(ROOT, "scripts", script), ...extraArgs], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with ${code}`));
    });
  });
}

async function main() {
  const maxRounds = Number(process.env.SANITIZE_MAX_ROUNDS ?? 8) || 8;
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase env");

  const supabaseHost = new URL(url).hostname;
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("━━━ Complete description image sanitization ━━━");

  for (let round = 1; round <= maxRounds; round++) {
    const remaining = await countExternalDescriptionProducts(supabase, supabaseHost);
    console.log(`\nRound ${round}/${maxRounds}: ${remaining} product(s) still have external description images`);

    if (remaining === 0) {
      console.log("\n✓ All description HTML images are on Supabase (or removed).");
      return;
    }

    await runNodeScript("sanitize-product-description-images.mjs", [
      "--workers",
      process.env.SANITIZE_WORKERS ?? "12",
      "--upsert-workers",
      process.env.SANITIZE_UPSERT_WORKERS ?? "8",
      "--strip-remaining",
      "--quiet",
    ]);
  }

  const left = await countExternalDescriptionProducts(supabase, supabaseHost);
  if (left > 0) {
    console.error(`\n⚠ ${left} product(s) still have external description images after ${maxRounds} round(s).`);
    process.exit(1);
  }
  console.log("\n✓ Complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
