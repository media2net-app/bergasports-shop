import fs from "node:fs";
import path from "node:path";

let cachedRoot: string | null = null;

/**
 * Zoekt de projectroot waar `src/data/bergasports-catalog.json` staat.
 */
export function resolveProjectRootForDataFiles(): string {
  if (cachedRoot) {
    return cachedRoot;
  }
  let dir = process.cwd();
  for (let i = 0; i < 24; i++) {
    const catalog = path.join(dir, "src", "data", "bergasports-catalog.json");
    const legacy = path.join(dir, "src", "data", "trendyol-products.json");
    if (fs.existsSync(catalog) || fs.existsSync(legacy)) {
      cachedRoot = dir;
      return cachedRoot;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  cachedRoot = process.cwd();
  return cachedRoot;
}

export function bergasportsCatalogJsonPath(): string {
  const root = resolveProjectRootForDataFiles();
  const primary = path.join(root, "src", "data", "bergasports-catalog.json");
  if (fs.existsSync(primary)) {
    return primary;
  }
  return path.join(root, "src", "data", "trendyol-products.json");
}

/** @deprecated Gebruik bergasportsCatalogJsonPath() */
export function trendyolProductsJsonPath(): string {
  return bergasportsCatalogJsonPath();
}

export function ralexCategoriesJsonPath(): string {
  return path.join(resolveProjectRootForDataFiles(), "src", "data", "ralex-categories.json");
}
