/**
 * Mirror external product images (ralexpucioasa.ro etc.) into Supabase Storage bucket `product-images`.
 *
 * Usage:
 *   node scripts/migrate-product-images-to-storage.mjs
 *   node scripts/migrate-product-images-to-storage.mjs --limit 100 --concurrency 8
 *   node scripts/migrate-product-images-to-storage.mjs --product-id 12345
 *   node scripts/migrate-product-images-to-storage.mjs --dry-run
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");
const BUCKET = "product-images";

function loadEnv() {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) {
    throw new Error("Geen .env.local");
  }
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
    delayMs: 0,
    workers: 12,
    upsertWorkers: 8,
    quiet: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--quiet") out.quiet = true;
    else if (a === "--limit") out.limit = Number(argv[++i]) || 0;
    else if (a === "--offset") out.offset = Number(argv[++i]) || 0;
    else if (a === "--product-id") out.productId = Number(argv[++i]) || 0;
    else if (a === "--delay-ms") out.delayMs = Number(argv[++i]) || 0;
    else if (a === "--workers") out.workers = Math.max(1, Number(argv[++i]) || 12);
    else if (a === "--upsert-workers") out.upsertWorkers = Math.max(1, Number(argv[++i]) || 8);
    else if (a === "--concurrency") out.workers = Math.max(1, Number(argv[++i]) || 12);
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
    const path = u.pathname.length > 48 ? `…${u.pathname.slice(-44)}` : u.pathname;
    return `${u.hostname}${path}`;
  } catch {
    return url.slice(0, 60);
  }
}

function hashSourceUrl(url) {
  return createHash("sha256").update(url.trim()).digest("hex");
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
  const t = url?.trim();
  if (!t || !/^https?:\/\//i.test(t)) return false;
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

function collectUrls(product) {
  const urls = new Set();
  if (product.image?.trim()) urls.add(product.image.trim());
  for (const img of product.images ?? []) {
    if (img?.trim()) urls.add(img.trim());
  }
  for (const v of product.wcVariations ?? []) {
    if (v.image?.trim()) urls.add(v.image.trim());
  }
  return [...urls];
}

function applyMap(product, map) {
  const next = { ...product };
  if (next.image?.trim() && map.has(next.image.trim())) {
    next.image = map.get(next.image.trim());
  }
  if (next.images?.length) {
    next.images = next.images.map((u) => (u?.trim() && map.has(u.trim()) ? map.get(u.trim()) : u));
  }
  if (next.wcVariations?.length) {
    next.wcVariations = next.wcVariations.map((v) => {
      const img = v.image?.trim();
      if (img && map.has(img)) {
        return { ...v, image: map.get(img) };
      }
      return v;
    });
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

/** Run async fn on each item with at most `concurrency` in flight. */
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

function isFullyHosted(product, supabaseHost) {
  const urls = collectUrls(product);
  if (!urls.length) return false;
  return urls.every((u) => isHosted(u, supabaseHost));
}

async function main() {
  const args = parseArgs(process.argv);
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY vereist in .env.local");
  }
  const supabaseHost = new URL(url).hostname;

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const urlCache = new Map();
  const inflight = new Map();
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
    if (args.dryRun) {
      const fake = `${url}/storage/v1/object/public/${BUCKET}/mirror/dry-run.jpg`;
      urlCache.set(sourceUrl, fake);
      return { publicUrl: fake, kind: "dry-run" };
    }

    const res = await fetch(sourceUrl, {
      headers: { Accept: "image/*", "User-Agent": "E-StoreHouse-ImageMirror/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = extFromMime(contentType, sourceUrl);
    const hash = hashSourceUrl(sourceUrl);
    const storagePath = `mirror/${hash.slice(0, 2)}/${hash}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });
    if (upErr) {
      throw new Error(upErr.message);
    }
    const publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${storagePath}`;
    await supabase.from("product_image_assets").upsert(
      {
        source_url: sourceUrl,
        storage_path: storagePath,
        public_url: publicUrl,
        content_type: contentType,
        byte_size: buffer.length,
      },
      { onConflict: "source_url" },
    );
    urlCache.set(sourceUrl, publicUrl);
    await sleep(args.delayMs);
    return { publicUrl, kind: "upload" };
  }

  async function getOrMirror(sourceUrl) {
    if (urlCache.has(sourceUrl)) {
      return { publicUrl: urlCache.get(sourceUrl), kind: "memory" };
    }
    if (inflight.has(sourceUrl)) {
      return inflight.get(sourceUrl);
    }

    const work = (async () => {
      const { data: cached } = await supabase
        .from("product_image_assets")
        .select("public_url")
        .eq("source_url", sourceUrl)
        .maybeSingle();
      if (cached?.public_url) {
        urlCache.set(sourceUrl, cached.public_url);
        return { publicUrl: cached.public_url, kind: "db" };
      }
      return withNetSlot(() => mirrorSourceUrl(sourceUrl));
    })();

    inflight.set(sourceUrl, work);
    try {
      return await work;
    } finally {
      inflight.delete(sourceUrl);
    }
  }

  async function prefetchUrlCache(sourceUrls) {
    const unique = [...new Set(sourceUrls)];
    const chunkSize = 150;
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const data = await withRetries(
        async () => {
          const { data: rows, error } = await supabase
            .from("product_image_assets")
            .select("source_url, public_url")
            .in("source_url", chunk);
          if (error) {
            throw new Error(error.message);
          }
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

  let products = [];
  if (args.productId > 0) {
    const { data, error } = await supabase.from("products").select("id, data").eq("id", args.productId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`Product ${args.productId} niet gevonden`);
    products = [{ id: data.id, data: data.data }];
  } else {
    const pageSize = 500;
    let from = args.offset;
    while (true) {
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from("products")
        .select("id, data")
        .order("id", { ascending: true })
        .range(from, to);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      products.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
      if (args.limit > 0 && products.length >= args.limit) {
        products = products.slice(0, args.limit);
        break;
      }
    }
    if (args.limit > 0 && products.length > args.limit) {
      products = products.slice(0, args.limit);
    }
  }

  const prepared = products.map((row) => {
    const product = { ...row.data, id: row.data?.id ?? row.id };
    const external = collectUrls(product).filter((u) => shouldMirror(u, supabaseHost));
    return { product, external };
  });

  const allExternalUrls = prepared.flatMap((p) => p.external);
  if (allExternalUrls.length) {
    log(args, `Prefetching ${allExternalUrls.length} URL(s) from asset cache…`);
    try {
      await prefetchUrlCache(allExternalUrls);
      log(args, `Cache warm: ${urlCache.size} URL(s) already mirrored`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[${ts()}] Prefetch failed (${msg}) — continuing with per-URL cache lookups`);
    }
  }

  const startedAt = Date.now();
  const total = products.length;
  let skippedNoExternal = 0;
  let skippedAlreadyHosted = 0;
  const needsWork = [];

  for (let i = 0; i < prepared.length; i++) {
    const { product, external } = prepared[i];
    if (!collectUrls(product).length) {
      skippedNoExternal += 1;
      continue;
    }
    if (!external.length) {
      if (isFullyHosted(product, supabaseHost)) skippedAlreadyHosted += 1;
      else skippedNoExternal += 1;
      continue;
    }
    needsWork.push({ product, external });
  }

  const uniqueToMirror = [
    ...new Set(
      needsWork.flatMap((p) => p.external).filter((u) => !urlCache.has(u)),
    ),
  ];

  log(
    args,
    `━━━ Image migration start ━━━ products=${total} offset=${args.offset} limit=${args.limit || "all"} workers=${args.workers} upsert=${args.upsertWorkers}${args.dryRun ? " DRY-RUN" : ""}`,
  );
  log(
    args,
    `  ${needsWork.length} product(s) need work · ${uniqueToMirror.length} unique URL(s) to fetch · ${skippedAlreadyHosted} already hosted`,
  );

  let mirroredUrls = 0;
  let errors = 0;
  let urlsDone = 0;

  if (uniqueToMirror.length) {
    const mirrorStarted = Date.now();
    await mapWithConcurrency(uniqueToMirror, args.workers, async (source) => {
      try {
        const { kind } = await getOrMirror(source);
        if (kind === "upload") mirroredUrls += 1;
        urlsDone += 1;
        if (!args.quiet && urlsDone % 20 === 0) {
          const rate = (urlsDone / ((Date.now() - mirrorStarted) / 1000)).toFixed(1);
          log(args, `  … URLs ${urlsDone}/${uniqueToMirror.length} (${rate}/s)`);
        }
      } catch (e) {
        errors += 1;
        urlsDone += 1;
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[${ts()}] ✗ ${shortUrl(source)} — ${msg}`);
      }
    });
    const mirrorSec = ((Date.now() - mirrorStarted) / 1000).toFixed(1);
    log(args, `  URL phase done in ${mirrorSec}s — ${mirroredUrls} new upload(s), ${errors} error(s)`);
  }

  let updatedProducts = 0;
  const upsertStarted = Date.now();

  await mapWithConcurrency(needsWork, args.upsertWorkers, async ({ product, external }) => {
    const map = new Map();
    for (const source of external) {
      if (urlCache.has(source)) {
        map.set(source, urlCache.get(source));
      }
    }
    if (!map.size) return;

    const next = applyMap(product, map);
    if (JSON.stringify(next) === JSON.stringify(product)) return;

    if (!args.dryRun) {
      const { error } = await supabase.from("products").upsert(productToRow(next), { onConflict: "id" });
      if (error) {
        errors += 1;
        console.error(`[${ts()}] ✗ upsert #${product.id}: ${error.message}`);
        return;
      }
    }
    updatedProducts += 1;
  });

  if (needsWork.length) {
    const upsertSec = ((Date.now() - upsertStarted) / 1000).toFixed(1);
    log(args, `  Product upserts done in ${upsertSec}s — ${updatedProducts} row(s) updated`);
  }

  const durationSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  const { count: assetCount } = await supabase
    .from("product_image_assets")
    .select("source_url", { count: "exact", head: true });

  console.log("");
  log(args, `━━━ Done (${durationSec}s) ━━━`);
  log(args, `  Products in batch:     ${total}`);
  log(args, `  Skipped (no external): ${skippedNoExternal}`);
  log(args, `  Skipped (hosted):      ${skippedAlreadyHosted}`);
  log(args, `  Products updated:      ${updatedProducts}${args.dryRun ? " (dry-run, not written)" : ""}`);
  log(args, `  New images mirrored:   ${mirroredUrls}`);
  log(args, `  Image URL errors:      ${errors} (e.g. 404 — product may stay on external URL for that image)`);
  log(args, `  Total in Storage map:  ${assetCount ?? "?"} rows in product_image_assets`);
  if (args.limit > 0 && !args.productId) {
    log(args, `  Next batch: npm run migrate:product-images -- --limit ${args.limit} --offset ${args.offset + args.limit}`);
  }
  if (errors > 0) {
    log(args, `  Batch finished with ${errors} image error(s); exit 0 so batch runner can continue.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
