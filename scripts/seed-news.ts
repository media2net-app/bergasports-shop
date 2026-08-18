/**
 * Zet drie voorbeeld-nieuwsberichten klaar (alleen als de slugs nog niet bestaan).
 * Run: npx tsx scripts/seed-news.ts
 */
import fs from "node:fs";
import path from "node:path";

import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");

function loadEnv(): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const file of [".env", ".env.local"]) {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))
      ) {
        value = value.slice(1, -1);
      }
      merged[trimmed.slice(0, eq).trim()] = value;
    }
  }
  return merged;
}

const posts = [
  {
    slug: "nimbl-passen-in-dedemsvaart",
    title: "Nimbl passen: waarom maat belangrijker is dan gram",
    excerpt:
      "Wielrenschoenen koop je niet op een plaatje. In Dedemsvaart zetten we Nimbl op je voet — sluiting, volume en pedaalplaat in één keer goed.",
    category: "Nimbl",
    cover: "/content/ingmar-nimbl.jpg",
    alt: "Ingmar Berga bij de Nimbl-wand in de winkel",
    body: `<p>Een lichte schoen die knelt, rijd je niet. Een iets zwaardere die wél past, wel. Daarom passen we Nimbl in de winkel: eerst de voet, dan de carbonzool, dan de sluiting.</p>
<p>Neem je huidige schoenen mee als je die hebt. We zien meteen waar druk zit en welke leest beter werkt. Een deel van de collectie is op voorraad; speciale kleuren bestellen we.</p>
<p><a href="/afspraak">Plan een pasafspraak</a> of kom langs tijdens openingstijden.</p>`,
    publishedAt: "2026-08-12T10:00:00+02:00",
  },
  {
    slug: "van-topsport-naar-bergasports",
    title: "Van het podium naar de Julianastraat",
    excerpt:
      "NK marathonschaatsen, EK skeeleren, en nu een winkel waar materiaal hetzelfde mag zijn: zonder compromis.",
    category: "Wedstrijden",
    cover: "/content/ingmar-podium.jpg",
    alt: "Ingmar Berga als kampioen op het podium",
    body: `<p>Twee keer Nederlands kampioen marathonschaatsen, Europees kampioen skeeleren op de marathon in 2010, NK inline in 2019. Die jaren zitten in hoe we hier een fiets, schoen of helm kiezen: niet wat er op de poster staat, wat jij nodig hebt.</p>
<p>Lees het hele verhaal op <a href="/over-ons">Mijn verhaal</a>, of kom langs voor koffie en een eerlijk advies.</p>`,
    publishedAt: "2026-08-05T09:00:00+02:00",
  },
  {
    slug: "kask-helmen-in-de-winkel",
    title: "KASK in Dedemsvaart: van Mojito tot Protone",
    excerpt:
      "Een helm moet zitten voordat je hem meeneemt. We hebben KASK om te passen — ventilatie, vorm en sluiting in de winkel, niet pas thuis.",
    category: "Tips",
    cover: "/content/showroom-orbea.jpg",
    alt: "Showroom van Bergasports in Dedemsvaart",
    body: `<p>KASK maakt helmen die we zelf rijden: de Mojito voor elke dag, de Protone Icon als je meer bescherming en afwerking wilt, de Bambino voor op de tijdritfiets.</p>
<p>Kom passen of bekijk de collectie in de <a href="/helmen">shop</a>.</p>`,
    publishedAt: "2026-07-28T11:00:00+02:00",
  },
];

async function main() {
  const env = { ...loadEnv(), ...process.env };
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL ontbreekt");
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    for (const post of posts) {
      const res = await client.query(
        `INSERT INTO news_posts (
           id, slug, title, excerpt, body_html, cover_image, image_alt, category,
           published_at, is_published, created_at, updated_at
         ) VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
         ON CONFLICT (slug) DO NOTHING`,
        [post.slug, post.title, post.excerpt, post.body, post.cover, post.alt, post.category, post.publishedAt],
      );
      console.log(res.rowCount ? `Geseed: ${post.slug}` : `Overgeslagen: ${post.slug}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
