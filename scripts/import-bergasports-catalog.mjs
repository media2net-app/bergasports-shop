#!/usr/bin/env node
/**
 * Importeert het volledige Bergasports WooCommerce-catalogus:
 * categorieën (wp/v2/product_cat) + alle producten (Store API) incl. variaties.
 *
 *   node scripts/import-bergasports-catalog.mjs
 *   node scripts/import-bergasports-catalog.mjs --dry-run
 *   WC_STORE_BASE_URL=https://www.bergasports.com node scripts/import-bergasports-catalog.mjs
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const WC_BASE = (process.env.WC_STORE_BASE_URL || "https://www.bergasports.com").replace(/\/$/, "");
const STORE = `${WC_BASE}/wp-json/wc/store/v1`;
const WP_CAT = `${WC_BASE}/wp-json/wp/v2/product_cat`;
const SOURCE_SITE = "https://www.bergasports.com/";
const EXCLUDED_SLUGS = new Set([
  "bumbac",
  "uncategorized",
  "uncategorized-2",
  "bike-groups",
]);
const dryRun = process.argv.includes("--dry-run");
const delayMs = Number(process.env.IMPORT_DELAY_MS || "80");

function loadEnvFile(filename) {
  const p = path.join(root, filename);
  if (!fs.existsSync(p)) return {};
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripHtml(s) {
  return String(s || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Manufacturer names — never default to the shop name Bergasports. */
const CATALOG_BRANDS = [
  ["Double FF", /double\s*ff/i],
  ["CyclingCeramic", /cycling\s*ceramic/i],
  ["Cipollini", /cipollini/i],
  ["Colnago", /colnago/i],
  ["Cervélo", /cervel[oó]/i],
  ["Polygon", /polygon/i],
  ["Powerslide", /powerslide/i],
  ["LaFuga", /la\s*fuga/i],
  ["Orbea", /orbea/i],
  ["Basso", /basso/i],
  ["Titici", /titici/i],
  ["Sensa", /sensa/i],
  ["Scope", /scope/i],
  ["Nimbl", /nimbl/i],
  ["KASK", /\bkask\b/i],
  ["Favero", /\b(favero|assioma)\b/i],
  ["Wahoo", /\b(wahoo|elemnt)\b/i],
  ["Shokz", /\bshokz\b/i],
  ["100%", /(?:ride|rid)\s*100%?|\b100%/i],
  ["DMT", /\bdmt\b/i],
  ["MPC", /\bmpc\b/i],
  ["LGO", /\blgo\b/i],
];

function inferCatalogBrand(name, categories) {
  const hay = String(name || "");
  for (const [brand, re] of CATALOG_BRANDS) {
    if (re.test(hay)) return brand;
  }
  const slugs = (categories ?? []).map((c) => String(c.slug || "").toLowerCase());
  if (slugs.includes("lafuga-wear")) return "LaFuga";
  if (slugs.includes("scope-outlet")) return "Scope";
  if (slugs.includes("cycling-helmets")) return "KASK";
  return null;
}

function decodeHtmlTitle(text) {
  let s = String(text || "");
  while (s.includes("&amp;")) s = s.replace(/&amp;/g, "&");
  return s
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => {
      const cp = Number.parseInt(hex, 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : _;
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const cp = Number.parseInt(dec, 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : _;
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&ndash;/gi, "\u2013")
    .replace(/&mdash;/gi, "\u2014")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function slugify(title) {
  return decodeHtmlTitle(title)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function categoryShopPath(slug) {
  const s = String(slug || "").trim().toLowerCase();
  return s && !EXCLUDED_SLUGS.has(s) ? `/${s}` : "/shop";
}

function toMajorUnits(amount, minorUnit = 2) {
  if (!amount) return 0;
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return n / 10 ** minorUnit;
}

async function fetchJson(url, label) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`${label || url}: HTTP ${r.status} ${text.slice(0, 200)}`);
  }
  return r.json();
}

async function fetchAllWpProductCats() {
  const all = [];
  let page = 1;
  for (;;) {
    const url = `${WP_CAT}?per_page=100&page=${page}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`product_cat HTTP ${r.status}`);
    const batch = await r.json();
    if (!Array.isArray(batch) || !batch.length) break;
    all.push(...batch);
    const totalPages = Number(r.headers.get("x-wp-totalpages") || "1");
    if (page >= totalPages) break;
    page += 1;
    await sleep(delayMs);
  }
  return all.filter((c) => !EXCLUDED_SLUGS.has(String(c.slug).toLowerCase()));
}

async function fetchStoreCategoryDescriptions() {
  const map = new Map();
  let page = 1;
  for (;;) {
    const url = `${STORE}/products/categories?per_page=100&page=${page}`;
    const r = await fetch(url);
    if (!r.ok) break;
    const batch = await r.json();
    if (!Array.isArray(batch) || !batch.length) break;
    for (const c of batch) {
      if (c?.id != null && c.description) {
        map.set(c.id, String(c.description));
      }
    }
    const totalPages = Number(r.headers.get("x-wp-totalpages") || "1");
    if (page >= totalPages) break;
    page += 1;
  }
  return map;
}

async function fetchAllStoreProducts() {
  const all = [];
  let page = 1;
  let totalPages = 1;
  for (;;) {
    const url = `${STORE}/products?per_page=100&page=${page}`;
    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error(`products HTTP ${r.status}: ${text.slice(0, 200)}`);
    }
    const batch = await r.json();
    if (!Array.isArray(batch)) throw new Error("Ongeldig producten-antwoord");
    all.push(...batch);
    totalPages = Number(r.headers.get("x-wp-totalpages") || r.headers.get("X-WP-TotalPages") || "1");
    if (!batch.length || page >= totalPages) break;
    page += 1;
    await sleep(delayMs);
  }
  return all.filter((p) => p.type !== "variation");
}

async function fetchVariationsForParent(parentId) {
  const url = `${STORE}/products?type=variation&parent=${parentId}&per_page=100`;
  const rows = await fetchJson(url, `variations ${parentId}`);
  return Array.isArray(rows) ? rows : [];
}

async function fetchAllVariations(parentIds) {
  const map = new Map();
  const concurrency = 8;
  for (let i = 0; i < parentIds.length; i += concurrency) {
    const slice = parentIds.slice(i, i + concurrency);
    const results = await Promise.all(
      slice.map(async (id) => {
        try {
          return [id, await fetchVariationsForParent(id)];
        } catch {
          return [id, []];
        }
      }),
    );
    for (const [id, vars] of results) map.set(id, vars);
    if (delayMs > 0 && i + concurrency < parentIds.length) await sleep(delayMs);
  }
  return map;
}

function wcVariationToJson(v) {
  const minor = v.prices?.currency_minor_unit ?? 2;
  const display = toMajorUnits(v.prices?.price, minor);
  const regular = toMajorUnits(v.prices?.regular_price, minor);
  const onSale = Boolean(v.on_sale && regular > display && display >= 0);
  const label =
    typeof v.variation === "string" && v.variation.trim()
      ? v.variation.trim()
      : `Variatie #${v.id}`;
  const img = v.images?.[0]?.src?.trim();
  return {
    id: v.id,
    label,
    price: display,
    regularPrice: regular,
    onSale,
    sku: typeof v.sku === "string" && v.sku.trim() ? v.sku.trim() : undefined,
    url: v.permalink,
    image: img || undefined,
  };
}

function wcProductToJson(p, categoryLabel, variationRows) {
  const minor = p.prices?.currency_minor_unit ?? 2;
  const display = toMajorUnits(p.prices?.price, minor);
  const regular = toMajorUnits(p.prices?.regular_price, minor);
  const onSale = Boolean(p.on_sale && regular > display && display >= 0);
  const imgs = (p.images ?? []).map((i) => i.src).filter(Boolean);
  const primary = imgs[0] ?? "";
  const currencyCode = p.prices?.currency_code?.trim() || "EUR";
  const currency =
    currencyCode === "EUR" ? "EUR" : currencyCode === "RON" ? "Lei" : currencyCode;

  let discount;
  if (onSale && regular > 0) {
    discount = Math.min(99, Math.max(1, Math.round(((regular - display) / regular) * 100)));
  }

  const name = decodeHtmlTitle(stripHtml(p.name) || `Product ${p.id}`);
  const shortHtml = typeof p.short_description === "string" ? p.short_description.trim() : "";
  const longHtml = typeof p.description === "string" ? p.description.trim() : "";
  const sku = typeof p.sku === "string" ? p.sku.trim() : "";
  const wcCategories =
    Array.isArray(p.categories) && p.categories.length > 0
      ? p.categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
      : undefined;

  const base = {
    id: p.id,
    name,
    brand: inferCatalogBrand(name, wcCategories) || undefined,
    category: categoryLabel,
    url: p.permalink,
    image: primary,
    images: imgs.length > 0 ? imgs : [primary].filter(Boolean),
    currency,
    priceCurrent: onSale ? regular : display,
    priceCurrentText: (onSale ? regular : display).toFixed(2),
    priceDiscounted: display,
    priceDiscountedText: display.toFixed(2),
    priceOld: onSale ? regular : 0,
    discount,
    freeCargo: true,
    sameDayShipping: false,
    hasFastDeliveryTag: false,
    hasFlashSaleTag: false,
    promotions: [],
    badges: {},
    socialProof: [],
    catalogSource: "manual",
    productStatus: "published",
  };

  if (variationRows?.length) {
    const mapped = variationRows.map(wcVariationToJson);
    const prices = mapped.map((x) => x.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    base.wcVariations = mapped;
    base.priceRangeMax = maxP;
    base.priceDiscounted = minP;
    base.priceDiscountedText = minP.toFixed(2);
    base.priceCurrent = minP;
    base.priceCurrentText = minP.toFixed(2);
    base.priceOld = 0;
    base.discount = undefined;
  }

  if (shortHtml) base.wcShortDescriptionHtml = shortHtml;
  if (longHtml) base.wcDescriptionHtml = longHtml;
  if (sku) base.wcSku = sku;
  if (p.slug) base.wcSlug = p.slug;
  if (p.type) base.wcProductType = p.type;
  if (p.average_rating != null && String(p.average_rating).trim() !== "") {
    base.wcAverageRating = String(p.average_rating);
  }
  if (typeof p.review_count === "number") base.wcReviewCount = p.review_count;
  if (typeof p.price_html === "string" && p.price_html.trim()) {
    base.wcPriceHtml = p.price_html.trim();
  }
  if (wcCategories) base.wcCategories = wcCategories;
  if (Array.isArray(p.attributes) && p.attributes.length > 0) {
    base.wcAttributes = p.attributes.map((a) => ({
      id: a.id,
      name: a.name,
      taxonomy: a.taxonomy,
      hasVariations: a.has_variations,
      terms: (a.terms ?? []).map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
    }));
  }

  return base;
}

function resolveCategoryLabel(p, categoriesById) {
  const cats = p.categories ?? [];
  if (cats.length > 0) {
    const primary = cats[0];
    const row = categoriesById.get(primary.id);
    const name = row?.name ?? primary.name;
    return String(name || "")
      .replace(/^\*\s*/, "")
      .trim();
  }
  return "Shop";
}

function uniqueSlug(base, productId, usedBySlug) {
  const rootSlug = slugify(base) || `product-${productId}`;
  const existing = usedBySlug.get(rootSlug);
  if (existing === undefined || existing === productId) return rootSlug;
  for (let n = 2; n < 500; n++) {
    const candidate = `${rootSlug}-${n}`;
    const owner = usedBySlug.get(candidate);
    if (owner === undefined || owner === productId) return candidate;
  }
  return `product-${productId}`;
}

function resolveProductSlug(product) {
  const stored = product.slug?.trim().toLowerCase();
  if (stored) return slugify(stored) || stored;
  const fromWc = product.wcSlug?.trim();
  if (fromWc) return slugify(fromWc) || fromWc;
  return slugify(product.name) || `product-${product.id}`;
}

async function main() {
  console.log(`Bron: ${WC_BASE}`);
  console.log(dryRun ? "Dry run — geen database-wijzigingen\n" : "");

  const [wpCats, descByCatId] = await Promise.all([
    fetchAllWpProductCats(),
    fetchStoreCategoryDescriptions(),
  ]);

  const categories = wpCats.map((c) => ({
    id: c.id,
    name: decodeHtmlTitle(c.name),
    slug: c.slug,
    parent: c.parent ?? 0,
    count: c.count ?? 0,
    link: categoryShopPath(c.slug),
    seoIntro: descByCatId.get(c.id) ? stripHtml(descByCatId.get(c.id)).slice(0, 500) : null,
    seoFooterHtml: descByCatId.get(c.id) || null,
  }));

  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  console.log(`Categorieën: ${categories.length}`);

  const remote = await fetchAllStoreProducts();
  console.log(`Producten (Store API): ${remote.length}`);

  const variableParentIds = remote
    .filter((p) => p.type === "variable" && (p.variations?.length ?? 0) > 0)
    .map((p) => p.id);

  console.log(`Variable producten: ${variableParentIds.length} — variaties ophalen…`);
  const variationsByParent = await fetchAllVariations(variableParentIds);

  const mapped = remote.map((p) => {
    const label = resolveCategoryLabel(p, categoriesById);
    const vars = variationsByParent.get(p.id);
    return wcProductToJson(p, label, vars?.length ? vars : undefined);
  });

  if (dryRun) {
    const withVars = mapped.filter((p) => p.wcVariations?.length).length;
    const withImg = mapped.filter((p) => p.image).length;
    const withDesc = mapped.filter((p) => p.wcDescriptionHtml).length;
    console.log(`\nDry run samenvatting:`);
    console.log(`  Met variaties: ${withVars}`);
    console.log(`  Met afbeelding: ${withImg}`);
    console.log(`  Met beschrijving: ${withDesc}`);
    for (const c of categories.filter((x) => x.parent === 0)) {
      const kids = categories.filter((x) => x.parent === c.id);
      console.log(`  · ${c.name} (${c.count}) — ${kids.length} sub`);
    }
    return;
  }

  const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local"), ...process.env };
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL ontbreekt in .env / .env.local");
    process.exit(1);
  }

  const now = new Date().toISOString();
  const isLocal = /localhost|127\.0\.0\.1/i.test(databaseUrl);
  const pool = new pg.Pool(
    isLocal
      ? { connectionString: databaseUrl }
      : {
          connectionString: databaseUrl,
          ssl: { rejectUnauthorized: false },
          max: 1,
        },
  );
  const usedBySlug = new Map();

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO catalog_meta (id, source, source_api, fetched_at, updated_at)
         VALUES (1, $1, $2, $3, $4::timestamptz)
         ON CONFLICT (id) DO UPDATE SET
           source = EXCLUDED.source,
           source_api = EXCLUDED.source_api,
           fetched_at = EXCLUDED.fetched_at,
           updated_at = EXCLUDED.updated_at`,
        [SOURCE_SITE, `${STORE}/products`, now, now],
      );

      const deletedCats = await client.query("DELETE FROM categories");
      console.log(`Categorieën gewist: ${deletedCats.rowCount ?? 0}`);
      const deletedProducts = await client.query("DELETE FROM products");
      console.log(`Producten gewist: ${deletedProducts.rowCount ?? 0}`);

      for (const c of categories) {
        await client.query(
          `INSERT INTO categories (
            id, name, slug, parent_id, product_count, link,
            seo_intro, seo_footer_html,
            import_completed_at, imported_product_count, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz,$10,$11::timestamptz)`,
          [
            c.id,
            c.name,
            c.slug,
            c.parent,
            c.count,
            c.link,
            c.seoIntro,
            c.seoFooterHtml,
            now,
            c.count,
            now,
          ],
        );
      }

      let upserted = 0;
      for (const product of mapped) {
        const slug = uniqueSlug(resolveProductSlug(product), product.id, usedBySlug);
        usedBySlug.set(slug, product.id);
        const data = { ...product, slug, featuredOnHomepage: false };
        await client.query(
          `INSERT INTO products (
            id, data, slug, name, brand, category, catalog_source,
            price_current, price_discounted, currency, image, url,
            featured_on_homepage, updated_at
          ) VALUES (
            $1, $2::jsonb, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12,
            false, $13::timestamptz
          )
          ON CONFLICT (id) DO UPDATE SET
            data = EXCLUDED.data,
            slug = EXCLUDED.slug,
            name = EXCLUDED.name,
            brand = EXCLUDED.brand,
            category = EXCLUDED.category,
            catalog_source = EXCLUDED.catalog_source,
            price_current = EXCLUDED.price_current,
            price_discounted = EXCLUDED.price_discounted,
            currency = EXCLUDED.currency,
            image = EXCLUDED.image,
            url = EXCLUDED.url,
            updated_at = EXCLUDED.updated_at`,
          [
            product.id,
            JSON.stringify(data),
            slug,
            product.name,
            product.brand,
            product.category,
            "manual",
            product.priceCurrent ?? null,
            product.priceDiscounted ?? null,
            product.currency ?? "EUR",
            product.image || null,
            product.url || null,
            now,
          ],
        );
        upserted += 1;
      }

      await client.query("COMMIT");
      console.log(`\nKlaar: ${categories.length} categorieën, ${upserted} producten geïmporteerd.`);

      const jsonOut = {
        source: SOURCE_SITE,
        sourceApi: WP_CAT,
        fetchedAt: now,
        totalCategories: categories.length,
        categories: categories.map(({ seoIntro, seoFooterHtml, ...rest }) => rest),
        tree: buildTree(categories),
      };
      fs.writeFileSync(
        path.join(root, "src/data/ralex-categories.json"),
        `${JSON.stringify(jsonOut, null, 2)}\n`,
      );
      console.log("Bijgewerkt: src/data/ralex-categories.json");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

function buildTree(categories) {
  const byParent = new Map();
  for (const c of categories) {
    const pid = c.parent;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push(c);
  }
  function children(pid) {
    return (byParent.get(pid) ?? []).map((c) => ({
      ...c,
      children: children(c.id),
    }));
  }
  return children(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
