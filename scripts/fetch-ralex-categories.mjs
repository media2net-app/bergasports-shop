/**
 * Haalt alle WooCommerce product_cat van ralexpucioasa.ro op en schrijft src/data/ralex-categories.json.
 * Run: node scripts/fetch-ralex-categories.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outFile = path.join(root, "src", "data", "ralex-categories.json");

const base =
  (process.env.WC_STORE_BASE_URL || "https://www.bergasports.com").replace(/\/$/, "") +
  "/wp-json/wp/v2/product_cat";

async function main() {
  let page = 1;
  const all = [];
  for (;;) {
    const url = `${base}?per_page=100&page=${page}`;
    const r = await fetch(url);
    if (!r.ok) {
      throw new Error(`HTTP ${r.status} ${url}`);
    }
    const batch = await r.json();
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }
    all.push(...batch);
    const totalPages = Number(r.headers.get("x-wp-totalpages") || "1");
    if (page >= totalPages) {
      break;
    }
    page++;
  }

  const slim = all.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parent: c.parent,
    count: c.count,
    link: c.link,
  }));
  slim.sort((a, b) => a.parent - b.parent || a.name.localeCompare(b.name));

  function children(pid) {
    return slim.filter((c) => c.parent === pid).map((c) => ({ ...c, children: children(c.id) }));
  }

  const treeRoots = slim.filter((c) => c.parent === 0);
  const tree = treeRoots.map((c) => ({ ...c, children: children(c.id) }));

  const out = {
    source: "https://www.bergasports.com/",
    sourceApi: base,
    fetchedAt: new Date().toISOString(),
    totalCategories: slim.length,
    categories: slim,
    tree,
  };

  fs.writeFileSync(outFile, `${JSON.stringify(out, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${slim.length} categories to ${outFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
