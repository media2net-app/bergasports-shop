import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const base = (env.EASY_SALES_API_BASE_URL || "https://easy-sales.com/api/v2").replace(/\/$/, "");
const token = env.EASY_SALES_API_TOKEN?.trim();
const wt = env.EASY_SALES_WEBSITE_TOKEN?.trim();

const listRes = await fetch(`${base}/products?website_token=${encodeURIComponent(wt)}&per_page=1`, {
  headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
});
const sample = (await listRes.json()).data?.[0];
console.log("sample id", sample?.id, "website_id", sample?.product_website_id, "stock", sample?.stock);

const fullRes = await fetch(`${base}/products/${sample.id}?website_token=${encodeURIComponent(wt)}`, {
  headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
});
console.log("GET single", fullRes.status, (await fullRes.clone().text()).slice(0, 200));

const attempts = [
  {
    name: "PUT /products/{id} full+stock",
    url: `${base}/products/${sample.id}?website_token=${encodeURIComponent(wt)}`,
    method: "PUT",
    body: { ...sample, stock: sample.stock },
  },
  {
    name: "PUT /products/list array",
    url: `${base}/products/list`,
    method: "PUT",
    body: { website_token: wt, products: [{ id: sample.id, stock: sample.stock }] },
  },
  {
    name: "PUT /products/list website_id",
    url: `${base}/products/list`,
    method: "PUT",
    body: {
      website_token: wt,
      products: [{ product_website_id: sample.product_website_id, stock: sample.stock }],
    },
  },
  {
    name: "PUT /products/{id}",
    url: `${base}/products/${sample.id}`,
    method: "PUT",
    body: { website_token: wt, stock: sample.stock },
  },
  {
    name: "PATCH /products/{id}",
    url: `${base}/products/${sample.id}`,
    method: "PATCH",
    body: { website_token: wt, stock: sample.stock },
  },
  {
    name: "POST /products/update-stock",
    url: `${base}/products/update-stock`,
    method: "POST",
    body: { website_token: wt, sku: sample.sku, stock: sample.stock },
  },
];

for (const a of attempts) {
  const res = await fetch(a.url, {
    method: a.method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(a.body),
  });
  const text = await res.text();
  console.log(`\n${a.name}: ${res.status}`);
  console.log(text.slice(0, 500));
}
