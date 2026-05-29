import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
const env = {};
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}

const base = (env.EASY_SALES_API_BASE_URL || "https://easy-sales.com/api/v2").replace(/\/$/, "");
const token = env.EASY_SALES_API_TOKEN?.trim();
const wt = env.EASY_SALES_WEBSITE_TOKEN?.trim();

if (!token) {
  console.error("No token");
  process.exit(1);
}

const paths = [
  "/products/list",
  "/products",
  "/product/list",
  "/stocks/list",
  "/stock/list",
];

const listRes = await fetch(`${base}/products?website_token=${encodeURIComponent(wt || "")}&per_page=2`, {
  headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
});
const listJson = await listRes.json();
console.log("GET /products sample keys:", listJson.data?.[0] ? Object.keys(listJson.data[0]) : listJson);
console.log("pagination:", listJson.meta ?? listJson.pagination ?? "none");

// PUT /products/list probe (dry - invalid stock to see schema)
const sample = listJson.data?.[0];
if (sample) {
  const putBody = {
    website_token: wt,
    products: [
      {
        product_website_id: sample.product_website_id,
        sku: sample.sku,
        stock: sample.stock,
      },
    ],
  };
  const putRes = await fetch(`${base}/products/list`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(putBody),
  });
  const putText = await putRes.text();
  console.log("\nPUT /products/list", putRes.status, putText.slice(0, 800));
}
