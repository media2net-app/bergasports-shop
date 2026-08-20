#!/usr/bin/env node
/** Seed shipping rates + WELCOME5 coupon */
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? undefined : { rejectUnauthorized: false },
  max: 1,
});

await pool.query(`
  INSERT INTO coupons (id, code, type, amount, min_subtotal, active, created_at)
  VALUES (gen_random_uuid()::text, 'WELCOME5', 'percent', 5, 50, true, NOW())
  ON CONFLICT (code) DO NOTHING
`);

const rates = [
  ["NL", "Afhalen in Dedemsvaart", "pickup", 0, null, "Op afspraak", 0],
  ["NL", "Verzending Nederland", "standard", 6.95, 150, "1–3 werkdagen", 1],
  ["BE", "Verzending België", "standard", 12.95, null, "2–4 werkdagen", 0],
  ["DE", "Verzending Duitsland", "standard", 14.95, null, "2–5 werkdagen", 0],
  ["EU", "Verzending EU", "standard", 24.95, null, "3–7 werkdagen", 0],
];

for (const [country, label, method, price, freeAbove, days, sort] of rates) {
  const existing = await pool.query(
    `SELECT id FROM shipping_rates WHERE country_code = $1 AND method = $2 LIMIT 1`,
    [country, method],
  );
  if (existing.rows[0]) {
    await pool.query(
      `UPDATE shipping_rates SET label=$3, price=$4, free_above=$5, estimated_days=$6, active=true, sort_order=$7
       WHERE id=$1`,
      [existing.rows[0].id, country, label, price, freeAbove, days, sort],
    );
  } else {
    await pool.query(
      `INSERT INTO shipping_rates (
        id, country_code, label, method, price, free_above, estimated_days, active, sort_order
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, true, $7
      )`,
      [country, label, method, price, freeAbove, days, sort],
    );
  }
}

// Category SEO intros (NL); EN leeft in translations via category-copy / cat:skeelers
const seo = [
  [
    "road-bike",
    "High-end racefietsen voor renners die meer uit hun materiaal willen halen. Bij Bergasports vind je Colnago, Cipollini, Orbea, Basso, Cervélo en meer — met advies over maat, groepset en wielen.",
    null,
  ],
  [
    "gravelbike",
    "Van snelle gravelraces tot lange avonturen: kies een gravelbike die past bij jouw terrein en rijstijl. Persoonlijk advies vanuit Dedemsvaart.",
    null,
  ],
  [
    "mtb",
    "Performance mountainbikes voor cross-country, trails en technische parcoursen. Persoonlijk advies vanuit Dedemsvaart.",
    null,
  ],
  [
    "wheels",
    "De juiste wielset verandert het karakter van je fiets. Carbon wielsets van Scope en meer — voor race, gravel en performance.",
    null,
  ],
  [
    "cycling-shoes",
    "Fietsschoenen van Nimbl en andere topmerken — licht, stijf en te passen in Dedemsvaart.",
    null,
  ],
  [
    "lafuga-wear",
    "LaFuga custom kleding — designed by Ingmar Berga. Standaard collectie in de shop, maatwerk voor jouw team.",
    null,
  ],
  [
    "glasses",
    "Sportbrillen en fietsbrillen met heldere lenzen en een goede pasvorm. Persoonlijk advies vanuit Dedemsvaart.",
    null,
  ],
  [
    "accessories",
    "Helmen, brillen, schoenplaatjes, groepsets en alle andere fietsaccessoires. Persoonlijk advies vanuit Dedemsvaart.",
    null,
  ],
  [
    "speed-skates",
    "Skeelers, schoenen, frames, wielen en lagers voor training en wedstrijd. Advies van oud-topsporter Ingmar Berga uit Dedemsvaart.",
    null,
  ],
];

for (const [slug, intro, footer] of seo) {
  await pool.query(
    `UPDATE categories SET seo_intro = $2, seo_footer_html = COALESCE($3, seo_footer_html), updated_at = NOW()
     WHERE slug = $1`,
    [slug, intro, footer],
  );
}

await pool.end();
console.log("seeded coupons/shipping/seo");
