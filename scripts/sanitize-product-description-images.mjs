/**
 * Mirror external <img> URLs in wcDescriptionHtml / wcShortDescriptionHtml to Supabase Storage.
 *
 * Usage:
 *   node scripts/sanitize-product-description-images.mjs
 *   node scripts/sanitize-product-description-images.mjs --limit 200 --offset 0
 *   node scripts/sanitize-product-description-images.mjs --workers 12 --strip-remaining
 *   node scripts/sanitize-product-description-images.mjs --dry-run
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");
const BUCKET = "product-images";

const IMG_ATTR_RES = [
  /\bsrc\s*=\s*["']([^"']+)["']/gi,
  /\bdata-src\s*=\s*["']([^"']+)["']/gi,
  /\bdata-lazy-src\s*=\s*["']([^"']+)["']/gi,
  /\bdata-original\s*=\s*["']([^"']+)["']/gi,
];

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
  const out = {
    limit: 0,
    offset: 0,
    productId: 0,
    dryRun: false,
    quiet: false,
    delayMs: 0,
    workers: 12,
    upsertWorkers: 8,
    stripRemaining: false,
    pageSize: 500,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--quiet") out.quiet = true;
    else if (a === "--strip-remaining") out.stripRemaining = true;
    else if (a === "--limit") out.limit = Number(argv[++i]) || 0;
    else if (a === "--offset") out.offset = Number(argv[++i]) || 0;
    else if (a === "--product-id") out.productId = Number(argv[++i]) || 0;
    else if (a === "--delay-ms") out.delayMs = Number(argv[++i]) || 0;
    else if (a === "--workers") out.workers = Math.max(1, Number(argv[++i]) || 12);
    else if (a === "--upsert-workers") out.upsertWorkers = Math.max(1, Number(argv[++i]) || 8);
    else if (a === "--page-size") out.pageSize = Math.max(50, Number(argv[++i]) || 500);
  }
  return out;
}

function ts() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function log(args, msg) {
  if (args.quiet) return;
  console.log(`[${ts()}] ${msg}`);
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    const p = u.pathname.length > 48 ? `…${u.pathname.slice(-44)}` : u.pathname;
    return `${u.hostname}${p}`;
  } catch {
    return url.slice(0, 60);
  }
}

function hashSourceUrl(url) {
  return createHash("sha256").update(url.trim()).digest("hex");
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

function shouldMirror(url, supabaseHost) {
  const t = normalizeFetchUrl(url);
  if (!t || !/^https:\/\//i.test(t)) return false;
  return !isHosted(t, supabaseHost);
}

function extFromMime(contentType, sourceUrl) {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("avif")) return "avif";
  try {
    const ext = new URL(sourceUrl).pathname.split(".").pop()?.toLowerCase() ?? "";
    if (["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext)) {
      return ext === "jpeg" ? "jpg" : ext;
    }
  } catch {
    /* ignore */
  }
  return "jpg";
}

function extractUrlsFromSrcset(value) {
  const urls = [];
  for (const part of value.split(",")) {
    const url = part.trim().split(/\s+/)[0]?.trim();
    if (url) urls.push(url);
  }
  return urls;
}

function extractUrlsFromImgTag(tag) {
  const urls = [];
  for (const re of IMG_ATTR_RES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(tag)) !== null) {
      if (m[1]?.trim()) urls.push(m[1].trim());
    }
  }
  const srcset = tag.match(/\bsrcset\s*=\s*["']([^"']+)["']/i)?.[1];
  if (srcset) urls.push(...extractUrlsFromSrcset(srcset));
  const style = tag.match(/\bstyle\s*=\s*["']([^"']+)["']/i)?.[1];
  if (style) {
    const bg = style.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i)?.[1];
    if (bg?.trim()) urls.push(bg.trim());
  }
  return urls;
}

function extractExternalImgUrls(html, supabaseHost) {
  if (!html?.trim()) return [];
  const urls = new Set();
  const tagRe = /<img\b[^>]*>/gi;
  let tag;
  while ((tag = tagRe.exec(html)) !== null) {
    for (const u of extractUrlsFromImgTag(tag[0])) {
      if (shouldMirror(u, supabaseHost)) {
        urls.add(normalizeFetchUrl(u));
      }
    }
  }
  const bgRe = /background-image\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  let bg;
  while ((bg = bgRe.exec(html)) !== null) {
    if (shouldMirror(bg[1], supabaseHost)) {
      urls.add(normalizeFetchUrl(bg[1]));
    }
  }
  return [...urls];
}

function collectDescriptionExternal(product, supabaseHost) {
  const short = product.wcShortDescriptionHtml ?? "";
  const long = product.wcDescriptionHtml ?? "";
  return [...new Set([...extractExternalImgUrls(short, supabaseHost), ...extractExternalImgUrls(long, supabaseHost)])];
}

function rewriteHtml(html, map) {
  let out = html;
  for (const [from, to] of map) {
    out = out.split(from).join(to);
    const httpsFrom = normalizeFetchUrl(from);
    if (httpsFrom !== from) {
      out = out.split(httpsFrom).join(to);
    }
    if (from.startsWith("https://")) {
      const httpFrom = `http://${from.slice(8)}`;
      out = out.split(httpFrom).join(to);
    }
  }
  return out;
}

function stripRemainingExternalImages(html, supabaseHost) {
  if (!html?.trim()) return html;
  let out = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const urls = extractUrlsFromImgTag(tag);
    const hasExternal = urls.some((u) => {
      const norm = normalizeFetchUrl(u);
      return norm && /^https:\/\//i.test(norm) && !isHosted(norm, supabaseHost);
    });
    return hasExternal ? "" : tag;
  });
  out = out.replace(/background-image\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/gi, (match, rawUrl) => {
    const norm = normalizeFetchUrl(rawUrl);
    if (norm && /^https:\/\//i.test(norm) && !isHosted(norm, supabaseHost)) {
      return "";
    }
    return match;
  });
  return out;
}

function applyDescriptionMaps(product, map, supabaseHost, stripRemaining) {
  const next = { ...product };
  if (next.wcShortDescriptionHtml) {
    let html = rewriteHtml(next.wcShortDescriptionHtml, map);
    if (stripRemaining) html = stripRemainingExternalImages(html, supabaseHost);
    next.wcShortDescriptionHtml = html;
  }
  if (next.wcDescriptionHtml) {
    let html = rewriteHtml(next.wcDescriptionHtml, map);
    if (stripRemaining) html = stripRemainingExternalImages(html, supabaseHost);
    next.wcDescriptionHtml = html;
  }
  return next;
}

function productToRow(product) {
  const featuredOnHomepage = Boolean(product.featuredOnHomepage);
  const slug = product.slug ?? null;
  return {
    id: product.id,
    data: { ...product, slug, featuredOnHomepage },
    slug,
    name: product.name,
    brand: product.brand ?? null,
    category: product.category ?? null,
    catalog_source: product.catalogSource ?? "trendyol",
    price_current: product.priceCurrent ?? null,
    price_discounted: product.priceDiscounted ?? null,
    currency: product.currency ?? "Lei",
    image: product.image,
    url: product.url,
    featured_on_homepage: featuredOnHomepage,
    updated_at: new Date().toISOString(),
  };
}

async function sleep(ms) {
  if (ms <= 0) return;
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetries(fn, { attempts = 4, delayMs = 1500, label = "operation" } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < attempts) {
        const wait = delayMs * attempt;
        console.error(`[${ts()}] ${label} failed (attempt ${attempt}/${attempts}), retry in ${wait}ms…`);
        await sleep(wait);
      }
    }
  }
  throw lastError;
}

async function mapWithConcurrency(items, concurrency, fn) {
  if (!items.length) return [];
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function loadProducts(supabase, args) {
  if (args.productId > 0) {
    const { data, error } = await supabase.from("products").select("id, data").eq("id", args.productId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`Product ${args.productId} niet gevonden`);
    return [{ id: data.id, data: data.data }];
  }

  const products = [];
  let from = args.offset;
  while (true) {
    const to = from + args.pageSize - 1;
    const { data, error } = await supabase
      .from("products")
      .select("id, data")
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    products.push(...data);
    if (data.length < args.pageSize) break;
    from += args.pageSize;
    if (args.limit > 0 && products.length >= args.limit) {
      return products.slice(0, args.limit);
    }
  }
  if (args.limit > 0 && products.length > args.limit) {
    return products.slice(0, args.limit);
  }
  return products;
}

async function main() {
  const args = parseArgs(process.argv);
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase env");

  const supabaseHost = new URL(url).hostname;
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const urlCache = new Map();
  const inflight = new Map();
  const failedUrls = new Set();
  let netSlots = args.workers;
  const netWaiters = [];

  async function withNetSlot(fn) {
    if (netSlots > 0) {
      netSlots -= 1;
      try {
        return await fn();
      } finally {
        netSlots += 1;
        const next = netWaiters.shift();
        if (next) next();
      }
    }
    await new Promise((resolve) => netWaiters.push(resolve));
    return withNetSlot(fn);
  }

  async function mirrorSourceUrl(sourceUrl) {
    const fetchUrl = normalizeFetchUrl(sourceUrl);
    if (args.dryRun) {
      const fake = `${url}/storage/v1/object/public/${BUCKET}/mirror/dry-run.jpg`;
      urlCache.set(sourceUrl, fake);
      urlCache.set(fetchUrl, fake);
      return { publicUrl: fake, kind: "dry-run" };
    }

    const res = await fetch(fetchUrl, {
      headers: {
        Accept: "image/*",
        "User-Agent": "E-StoreHouse-DescriptionMirror/2.0",
        Referer: "https://www.estorehouse.ro/",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = extFromMime(contentType, fetchUrl);
    const hash = hashSourceUrl(fetchUrl);
    const storagePath = `mirror/${hash.slice(0, 2)}/${hash}.${ext}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });
    if (upErr) throw new Error(upErr.message);

    const publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${storagePath}`;
    await supabase.from("product_image_assets").upsert(
      {
        source_url: fetchUrl,
        source_url_hash: hash,
        storage_path: storagePath,
        public_url: publicUrl,
        content_type: contentType,
        byte_size: buffer.length,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_url" },
    );
    urlCache.set(sourceUrl, publicUrl);
    urlCache.set(fetchUrl, publicUrl);
    await sleep(args.delayMs);
    return { publicUrl, kind: "upload" };
  }

  async function getOrMirror(sourceUrl) {
    const key = normalizeFetchUrl(sourceUrl) || sourceUrl;
    if (urlCache.has(key)) return { publicUrl: urlCache.get(key), kind: "memory" };
    if (inflight.has(key)) return inflight.get(key);

    const work = (async () => {
      const { data: cached } = await supabase
        .from("product_image_assets")
        .select("public_url")
        .eq("source_url", key)
        .maybeSingle();
      if (cached?.public_url) {
        urlCache.set(key, cached.public_url);
        urlCache.set(sourceUrl, cached.public_url);
        return { publicUrl: cached.public_url, kind: "db" };
      }
      return withNetSlot(() =>
        withRetries(() => mirrorSourceUrl(sourceUrl), {
          label: `mirror ${shortUrl(key)}`,
        }),
      );
    })();

    inflight.set(key, work);
    try {
      return await work;
    } finally {
      inflight.delete(key);
    }
  }

  async function prefetchUrlCache(sourceUrls) {
    const unique = [...new Set(sourceUrls.map((u) => normalizeFetchUrl(u)).filter(Boolean))];
    const chunkSize = 150;
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const data = await withRetries(
        async () => {
          const { data: rows, error } = await supabase
            .from("product_image_assets")
            .select("source_url, public_url")
            .in("source_url", chunk);
          if (error) throw new Error(error.message);
          return rows ?? [];
        },
        { label: `prefetch assets ${i}-${i + chunk.length}` },
      );
      for (const row of data) {
        if (row.source_url && row.public_url) {
          urlCache.set(row.source_url, row.public_url);
        }
      }
    }
  }

  const rows = await loadProducts(supabase, args);
  const prepared = rows.map((row) => {
    const product = { ...row.data, id: row.data?.id ?? row.id };
    const external = collectDescriptionExternal(product, supabaseHost);
    return { product, external };
  });

  const needsWork = prepared.filter((p) => p.external.length > 0);
  const stripOnly = prepared.filter((p) => {
    if (p.external.length > 0) return false;
    if (!args.stripRemaining) return false;
    const short = p.product.wcShortDescriptionHtml ?? "";
    const long = p.product.wcDescriptionHtml ?? "";
    const check = (html) => {
      if (!html?.trim()) return false;
      const tagRe = /<img\b[^>]*>/gi;
      let tag;
      while ((tag = tagRe.exec(html)) !== null) {
        for (const u of extractUrlsFromImgTag(tag[0])) {
          const norm = normalizeFetchUrl(u);
          if (norm && /^https:\/\//i.test(norm) && !isHosted(norm, supabaseHost)) return true;
        }
      }
      return false;
    };
    return check(short) || check(long);
  });

  const allExternal = needsWork.flatMap((p) => p.external);
  if (allExternal.length) {
    log(args, `Prefetching ${allExternal.length} description image URL(s) from asset cache…`);
    try {
      await prefetchUrlCache(allExternal);
      log(args, `Cache warm: ${urlCache.size} URL(s) already mirrored`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[${ts()}] Prefetch failed (${msg}) — continuing with per-URL lookups`);
    }
  }

  const uniqueToMirror = [...new Set(allExternal.filter((u) => !urlCache.has(normalizeFetchUrl(u))))];
  const startedAt = Date.now();

  log(
    args,
    `━━━ Description image sanitize ━━━ products=${rows.length} offset=${args.offset} limit=${args.limit || "all"} workers=${args.workers} strip=${args.stripRemaining}${args.dryRun ? " DRY-RUN" : ""}`,
  );
  log(
    args,
    `  ${needsWork.length} product(s) with external <img> · ${uniqueToMirror.length} unique URL(s) to fetch · ${stripOnly.length} strip-only`,
  );

  let mirroredUrls = 0;
  let urlErrors = 0;
  let urlsDone = 0;

  if (uniqueToMirror.length) {
    const mirrorStarted = Date.now();
    await mapWithConcurrency(uniqueToMirror, args.workers, async (source) => {
      try {
        const { kind } = await getOrMirror(source);
        if (kind === "upload") mirroredUrls += 1;
      } catch (e) {
        urlErrors += 1;
        failedUrls.add(normalizeFetchUrl(source));
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[${ts()}] ✗ ${shortUrl(source)} — ${msg}`);
      } finally {
        urlsDone += 1;
        if (!args.quiet && urlsDone % 25 === 0) {
          const rate = (urlsDone / ((Date.now() - mirrorStarted) / 1000)).toFixed(1);
          log(args, `  … URLs ${urlsDone}/${uniqueToMirror.length} (${rate}/s)`);
        }
      }
    });
    log(
      args,
      `  URL phase done — ${mirroredUrls} new upload(s), ${urlErrors} error(s), ${urlCache.size} cached`,
    );
  }

  let updatedProducts = 0;
  let strippedProducts = 0;

  const upsertTargets = [
    ...needsWork.map((p) => ({ ...p, mode: "mirror" })),
    ...(args.stripRemaining ? stripOnly.map((p) => ({ ...p, mode: "strip" })) : []),
  ];

  await mapWithConcurrency(upsertTargets, args.upsertWorkers, async ({ product, external, mode }) => {
    const map = new Map();
    for (const source of external) {
      const key = normalizeFetchUrl(source);
      if (urlCache.has(key)) map.set(source, urlCache.get(key));
      if (urlCache.has(source)) map.set(source, urlCache.get(source));
    }

    const before = JSON.stringify({
      s: product.wcShortDescriptionHtml,
      l: product.wcDescriptionHtml,
    });
    const next = applyDescriptionMaps(product, map, supabaseHost, args.stripRemaining);
    const after = JSON.stringify({ s: next.wcShortDescriptionHtml, l: next.wcDescriptionHtml });

    if (before === after) return;

    if (args.dryRun) {
      updatedProducts += 1;
      return;
    }

    const { error } = await supabase.from("products").upsert(productToRow(next), { onConflict: "id" });
    if (error) {
      urlErrors += 1;
      console.error(`[${ts()}] ✗ upsert #${product.id}: ${error.message}`);
      return;
    }
    if (mode === "strip") strippedProducts += 1;
    else updatedProducts += 1;
  });

  const durationSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("");
  log(args, `━━━ Done (${durationSec}s) ━━━`);
  log(args, `  Products in batch:       ${rows.length}`);
  log(args, `  Products updated:        ${updatedProducts}${args.dryRun ? " (dry-run)" : ""}`);
  log(args, `  Strip-only updates:      ${strippedProducts}`);
  log(args, `  New images mirrored:     ${mirroredUrls}`);
  log(args, `  Image URL errors:        ${urlErrors}`);
  if (args.limit > 0 && !args.productId) {
    log(args, `  Next batch: npm run sanitize:description-images -- --limit ${args.limit} --offset ${args.offset + args.limit} --strip-remaining`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
