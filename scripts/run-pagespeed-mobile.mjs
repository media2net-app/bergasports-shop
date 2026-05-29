/**
 * Run mobile PageSpeed for shop (and optional PDP URL), save to pagespeed_reports.
 *
 * Usage:
 *   node scripts/run-pagespeed-mobile.mjs
 *   node scripts/run-pagespeed-mobile.mjs --url https://www.estorehouse.ro/product/some-slug
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");

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

function parseArgs(argv) {
  const out = { url: "" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--url") out.url = argv[++i] ?? "";
  }
  if (!out.url) {
    out.url = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.estorehouse.ro").replace(/\/$/, "");
  }
  return out;
}

function categoryScore(lhr, id) {
  const raw = lhr.categories?.[id]?.score;
  if (raw == null || !Number.isFinite(raw)) return null;
  return Math.round(raw * 100);
}

function auditMetric(lhr, id) {
  const a = lhr.audits?.[id];
  if (!a) return null;
  return {
    id,
    title: a.title ?? id,
    displayValue: a.displayValue ?? null,
    numericValue: typeof a.numericValue === "number" ? a.numericValue : null,
    score: a.score ?? null,
  };
}

async function runPageSpeed(url, strategy, apiKey) {
  const params = new URLSearchParams({ url, strategy });
  for (const cat of ["performance", "accessibility", "best-practices", "seo"]) {
    params.append("category", cat);
  }
  if (apiKey) params.set("key", apiKey);

  const endpoint = `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`;
  const res = await fetch(endpoint, {
    signal: AbortSignal.timeout(90_000),
    headers: { Accept: "application/json" },
  });
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error?.message ?? `PageSpeed ${res.status}`);
  }
  const lhr = payload.lighthouseResult;
  if (!lhr) throw new Error("No Lighthouse data");

  return {
    strategy,
    url,
    analyzedUrl: lhr.finalUrl ?? url,
    fetchedAt: lhr.fetchTime ?? new Date().toISOString(),
    categories: {
      performance: categoryScore(lhr, "performance"),
      accessibility: categoryScore(lhr, "accessibility"),
      bestPractices: categoryScore(lhr, "best-practices"),
      seo: categoryScore(lhr, "seo"),
    },
    coreWebVitals: {
      fcp: auditMetric(lhr, "first-contentful-paint"),
      lcp: auditMetric(lhr, "largest-contentful-paint"),
      tbt: auditMetric(lhr, "total-blocking-time"),
      cls: auditMetric(lhr, "cumulative-layout-shift"),
      speedIndex: auditMetric(lhr, "speed-index"),
      tti: auditMetric(lhr, "interactive"),
    },
    opportunities: [],
    reportLink: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}&form_factor=${strategy}`,
    cruxAvailable: false,
  };
}

function cwvOk(report) {
  const perf = report.categories.performance;
  const lcp = report.coreWebVitals.lcp?.numericValue;
  const cls = report.coreWebVitals.cls?.numericValue;
  return (
    perf != null &&
    perf >= 80 &&
    (lcp == null || lcp <= 2500) &&
    (cls == null || cls <= 0.1)
  );
}

async function saveReport(supabase, report) {
  const { error } = await supabase.from("pagespeed_reports").insert({
    strategy: report.strategy,
    url: report.url,
    analyzed_url: report.analyzedUrl,
    fetched_at: report.fetchedAt,
    performance_score: report.categories.performance,
    accessibility_score: report.categories.accessibility,
    best_practices_score: report.categories.bestPractices,
    seo_score: report.categories.seo,
    report_json: report,
  });
  if (error) throw new Error(error.message);
}

async function main() {
  const args = parseArgs(process.argv);
  const env = loadEnv();
  const apiKey = env.GOOGLE_PAGESPEED_API_KEY?.trim();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase env");

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const target = args.url.replace(/\/$/, "");

  console.log(`Running mobile PageSpeed for ${target}…`);
  const report = await runPageSpeed(target, "mobile", apiKey);
  await saveReport(supabase, report);

  const lcp = report.coreWebVitals.lcp;
  const cls = report.coreWebVitals.cls;
  console.log(
    `Saved. Performance ${report.categories.performance} · LCP ${lcp?.displayValue ?? "—"} · CLS ${cls?.displayValue ?? "—"} · CWV OK: ${cwvOk(report)}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
