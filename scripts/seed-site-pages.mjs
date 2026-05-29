/**
 * Seed default CMS pages. Run: node scripts/seed-site-pages.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(import.meta.dirname, "..");

function loadEnv() {
  const p = path.join(root, ".env.local");
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

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const homepageBlocks = {
  hero: {
    eyebrow: "Colectie noua",
    title: "Bine ai venit la E-Store House",
    subtitle:
      "Descopera produse populare si selectii pentru casa, cadouri si uz zilnic. Servicii de incredere si livrare rapida.",
    ctaShop: "Magazinul",
    ctaOffers: "Vezi ofertele",
    promoLabel: "Saptamana aceasta",
    promoTitle: "Reducere de 20%",
    promoText: "La pachete selectate din categoria Casa.",
  },
};

const pages = [
  {
    slug: "home",
    path: "/",
    title: "Homepage",
    heading: null,
    body_html: "",
    blocks: homepageBlocks,
    sort_order: 0,
  },
  {
    slug: "about",
    path: "/despre-noi",
    title: "About us",
    heading: "Despre noi",
    body_html:
      "<p>E-Store House este un magazin online orientat pe produse pentru casa, confort si stil de viata. Selectam atent produsele si oferim o experienta simpla de cumparare, cu livrare rapida si suport prietenos.</p>",
    blocks: null,
    sort_order: 10,
  },
  {
    slug: "contact",
    path: "/contact",
    title: "Contact",
    heading: "Contact",
    body_html:
      "<ul><li>Email: info@estorehouse.nl</li><li>Telefon: vezi numarul din footer</li><li>Program: Lun-Vin, 09:00 - 17:00</li></ul>",
    blocks: null,
    sort_order: 20,
  },
  {
    slug: "terms",
    path: "/termeni-si-conditii",
    title: "Terms and conditions",
    heading: "Termeni si conditii",
    body_html:
      "<p>Prin utilizarea acestui site acceptati termenii si conditiile E-Store House. Comenzile sunt procesate conform informatiilor afisate la checkout.</p>",
    blocks: null,
    sort_order: 30,
  },
  {
    slug: "privacy",
    path: "/politica-de-confidentialitate",
    title: "Privacy policy",
    heading: "Politica de confidentialitate",
    body_html:
      "<p>Respectam confidentialitatea datelor dumneavoastra. Datele colectate la plasarea comenzii sunt folosite doar pentru procesarea si livrarea comenzii.</p>",
    blocks: null,
    sort_order: 40,
  },
  {
    slug: "shipping",
    path: "/livrare-si-retur",
    title: "Shipping & returns",
    heading: "Livrare si retur",
    body_html:
      "<p>Livrarea se face prin curier. Pentru intrebari despre retururi, contactati-ne la info@estorehouse.nl sau telefonic in programul de lucru.</p>",
    blocks: null,
    sort_order: 50,
  },
  {
    slug: "payment",
    path: "/metode-de-plata",
    title: "Payment methods",
    heading: "Metode de plata",
    body_html: "<p>Plata la livrare (ramburs) este disponibila pentru comenzile online.</p>",
    blocks: null,
    sort_order: 60,
  },
];

for (const page of pages) {
  const { error } = await supabase.from("site_pages").upsert(
    {
      ...page,
      is_published: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" },
  );
  if (error) {
    console.error(page.slug, error.message);
    process.exit(1);
  }
  console.log("Seeded:", page.slug, page.path);
}
