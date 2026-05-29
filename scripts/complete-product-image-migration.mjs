/**
 * Finish image migration: mirror any remaining external product image URLs,
 * then remove URLs that cannot be fetched (404) and keep only Supabase URLs.
 *
 * Usage: node scripts/complete-product-image-migration.mjs
 *        node scripts/complete-product-image-migration.mjs --dry-run
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");
const BUCKET = "product-images";

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

const dryRun = process.argv.includes("--dry-run");

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
      if (img && map.has(img)) return { ...v, image: map.get(img) };
      return v;
    });
  }
  return next;
}

function stripDeadExternals(product, supabaseHost) {
  const keepUrl = (u) => {
    const t = u?.trim();
    if (!t) return false;
    if (isHosted(t, supabaseHost)) return true;
    if (/^https?:\/\//i.test(t)) return false;
    return true;
  };

  let images = (product.images ?? []).filter(keepUrl);
  const unique = [...new Set(images)];
  images = unique;

  let image = product.image?.trim();
  if (image && !keepUrl(image)) {
    image = images.find((u) => isHosted(u, supabaseHost)) ?? "";
  }
  if (!image && images.length) {
    image = images.find((u) => isHosted(u, supabaseHost)) ?? images[0];
  }

  const wcVariations = (product.wcVariations ?? []).map((v) => {
    const img = v.image?.trim();
    if (img && !keepUrl(img)) {
      const fallback = image || images[0] || "";
      return fallback ? { ...v, image: fallback } : { ...v, image: undefined };
    }
    return v;
  });

  const next = {
    ...product,
    image: image || "",
    images: images.length ? images : image ? [image] : [],
    wcVariations,
  };

  if (!next.image && !next.images.length) {
    next.imageBroken = true;
    next.inStock = false;
    next.productStatus = "concept";
    next.featuredOnHomepage = false;
  }

  return next;
}

function hashSourceUrl(url) {
  return createHash("sha256").update(url.trim()).digest("hex");
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

async function main() {
  const env = loadEnv();
  const base = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("Supabase env ontbreekt");
  const supabaseHost = new URL(base).hostname;

  const supabase = createClient(base, key, { auth: { persistSession: false } });
  const urlCache = new Map();

  async function mirrorOne(sourceUrl) {
    if (urlCache.has(sourceUrl)) return urlCache.get(sourceUrl);

    const { data: cached } = await supabase
      .from("product_image_assets")
      .select("public_url")
      .eq("source_url", sourceUrl)
      .maybeSingle();
    if (cached?.public_url) {
      urlCache.set(sourceUrl, cached.public_url);
      return cached.public_url;
    }

    const res = await fetch(sourceUrl, {
      headers: { Accept: "image/*", "User-Agent": "E-StoreHouse-ImageMirror/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

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
    if (upErr) throw new Error(upErr.message);

    const publicUrl = `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`;
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
    return publicUrl;
  }

  let products = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, data")
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    products.push(...data.map((r) => ({ id: r.id, data: { ...r.data, id: r.data?.id ?? r.id } })));
    if (data.length < 1000) break;
    from += 1000;
  }

  const externalByProduct = [];
  for (const row of products) {
    const external = collectUrls(row.data).filter((u) => !isHosted(u, supabaseHost));
    if (external.length) externalByProduct.push({ row, external });
  }

  console.log(`Products: ${products.length}, with external image URL(s): ${externalByProduct.length}`);

  let mirrored = 0;
  let mirrorFailed = 0;

  for (const { row, external } of externalByProduct) {
    const map = new Map();
    for (const source of external) {
      try {
        const publicUrl = await mirrorOne(source);
        map.set(source, publicUrl);
        mirrored++;
        console.log(`  ✓ mirrored ${source.slice(0, 70)}…`);
      } catch (e) {
        mirrorFailed++;
        console.log(`  ✗ ${source.slice(0, 70)}… — ${e instanceof Error ? e.message : e}`);
      }
    }
    if (map.size) {
      row.data = applyMap(row.data, map);
    }
  }

  let updated = 0;
  let stripped = 0;
  let broken = 0;

  for (const row of products) {
    const before = JSON.stringify(row.data);
    let next = row.data;
    const stillExternal = collectUrls(next).some((u) => !isHosted(u, supabaseHost));
    if (stillExternal) {
      next = stripDeadExternals(next, supabaseHost);
      stripped++;
      if (next.imageBroken) broken++;
    }
    row.data = next;
    if (JSON.stringify(next) !== before) {
      if (!dryRun) {
        const featuredOnHomepage = Boolean(next.featuredOnHomepage);
        const slug = next.slug ?? null;
        const { error } = await supabase.from("products").upsert(
          {
            id: next.id,
            data: { ...next, slug, featuredOnHomepage },
            slug,
            name: next.name,
            brand: next.brand ?? null,
            category: next.category ?? null,
            catalog_source: next.catalogSource ?? "ralex",
            price_current: next.priceCurrent ?? null,
            price_discounted: next.priceDiscounted ?? null,
            currency: next.currency ?? "Lei",
            image: next.image,
            url: next.url,
            featured_on_homepage: featuredOnHomepage,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
        if (error) throw new Error(error.message);
      }
      updated++;
    }
  }

  let remaining = 0;
  for (const row of products) {
    if (collectUrls(row.data).some((u) => /^https?:/i.test(u) && !isHosted(u, supabaseHost))) {
      remaining++;
    }
  }

  console.log("");
  console.log(dryRun ? "DRY-RUN" : "Done");
  console.log(`  New mirrors:     ${mirrored}`);
  console.log(`  Mirror failed:   ${mirrorFailed}`);
  console.log(`  Rows updated:    ${updated}`);
  console.log(`  Stripped dead:   ${stripped}`);
  console.log(`  No valid image:  ${broken} (inStock=false, imageBroken)`);
  console.log(`  External left:   ${remaining} product(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
