/**
 * Print Phase 1 plan signal summary (same checks as admin 1M plan).
 * Usage: node scripts/verify-phase1-plan.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");
const LEGAL = ["terms", "privacy", "shipping", "cookies"];
const MIN_LEGAL = 400;

function loadEnv() {
  const p = path.join(ROOT, ".env.local");
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

function isMobileCwvGood(report) {
  if (!report) return false;
  const perf = report.categories?.performance;
  const lcp = report.coreWebVitals?.lcp?.numericValue;
  const cls = report.coreWebVitals?.cls?.numericValue;
  return perf != null && perf >= 80 && (lcp == null || lcp <= 2500) && (cls == null || cls <= 0.1);
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const sb = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const host = new URL(url).hostname;
  const BUCKET = "product-images";
  const HTTP = /^https:\/\//i;
  function hosted(u) {
    try {
      const x = new URL(u.trim());
      return x.hostname.toLowerCase() === host.toLowerCase() && x.pathname.includes(`/storage/v1/object/public/${BUCKET}/`);
    } catch {
      return false;
    }
  }

  let extImg = 0;
  let extDesc = 0;
  let withEs = 0;
  let from = 0;
  while (true) {
    const { data } = await sb.from("products").select("data").order("id").range(from, from + 499);
    if (!data?.length) break;
    for (const row of data) {
      const d = row.data || {};
      if (d.easySalesProductId) withEs++;
      for (const k of ["image", ...(d.images || [])]) {
        if (typeof k === "string" && HTTP.test(k) && !hosted(k)) extImg++;
      }
      const tagRe = /<img\b[^>]*>/gi;
      let tag;
      for (const key of ["wcShortDescriptionHtml", "wcDescriptionHtml"]) {
        const html = d[key];
        if (typeof html !== "string") continue;
        while ((tag = tagRe.exec(html))) {
          const src = tag[0].match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
          if (src && HTTP.test(src) && !hosted(src)) extDesc++;
        }
      }
    }
    if (data.length < 500) break;
    from += 500;
  }

  const { count: extCat } = await sb
    .from("categories")
    .select("id", { count: "exact", head: true })
    .or("link.ilike.%ralexpucioasa.ro%,link.ilike.%://%")
    .not("link", "like", "/%");

  const { data: legalRows } = await sb
    .from("site_pages")
    .select("slug, body_html, is_published")
    .in("slug", LEGAL);
  const legalPagesReady = LEGAL.every((slug) =>
    legalRows?.some(
      (r) =>
        r.slug === slug &&
        r.is_published &&
        typeof r.body_html === "string" &&
        r.body_html.length >= MIN_LEGAL,
    ),
  );

  const since7d = new Date(Date.now() - 7 * 864e5).toISOString();
  const { count: sessions7d } = await sb
    .from("analytics_sessions")
    .select("session_id", { count: "exact", head: true })
    .gte("first_seen_at", since7d);

  const { data: mobilePs } = await sb
    .from("pagespeed_reports")
    .select("report_json")
    .eq("strategy", "mobile")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const mobile = mobilePs?.report_json ?? null;
  const cwvOk = isMobileCwvGood(mobile);
  const easySalesConfigured = !!(env.EASY_SALES_API_TOKEN?.trim() && env.EASY_SALES_WEBSITE_TOKEN?.trim());
  const smtpEmail = !!(
    env.SMTP_HOST?.trim() &&
    env.SMTP_USER?.trim() &&
    (env.SMTP_PASS?.trim() || env.SMTP_PASSWORD?.trim())
  );
  const resendEmail = !!env.RESEND_API_KEY?.trim();

  const auto = new Set([
    "variant-ux",
    "remove-source-links",
    "delivery-transparency",
    "returns-policy",
    "stock-accuracy",
    "mobile-checkout",
    "structured-data",
    "sitemap-indexing",
    "image-optimization",
  ]);
  if (smtpEmail || resendEmail) auto.add("order-sla");
  if (extImg === 0) auto.add("migrate-product-images").add("own-db-catalog");
  if (extDesc === 0) auto.add("sanitize-descriptions").add("own-db-catalog");
  if (extCat === 0) auto.add("internal-category-links");
  if (legalPagesReady) auto.add("legal-ro");
  if (cwvOk) auto.add("cwv-mobile");
  if ((sessions7d ?? 0) >= 10) auto.add("analytics-baseline");
  if (easySalesConfigured) auto.add("easy-sales-alignment");
  if (withEs >= 50) auto.add("easy-sales-product-mapping");

  const list = [...auto].sort();
  console.log(
    JSON.stringify(
      {
        extProductImages: extImg,
        extDescriptionImages: extDesc,
        externalCategoryLinks: extCat,
        legalPagesReady,
        analyticsSessions7d: sessions7d,
        productsWithEasySalesMapping: withEs,
        easySalesConfigured,
        cwvMobileReady: cwvOk,
        latestMobilePerformance: mobile?.categories?.performance,
        latestMobileLcp: mobile?.coreWebVitals?.lcp?.displayValue,
        latestMobileCls: mobile?.coreWebVitals?.cls?.displayValue,
        autoVerifiedCount: list.length,
        autoVerified: list,
        needsAttention: [
          !legalPagesReady && "legal-ro",
          !cwvOk && "cwv-mobile",
          !(smtpEmail || resendEmail) &&
            "order-sla-emails (set SMTP_HOST+SMTP_USER+SMTP_PASS or RESEND_API_KEY on Vercel)",
          withEs < 50 && "easy-sales-product-mapping (export CSV from Admin → Products)",
        ].filter(Boolean),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
