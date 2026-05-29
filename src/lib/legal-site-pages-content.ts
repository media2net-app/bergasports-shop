/**
 * Standaard NL juridische/CMS-teksten voor site_pages seeding.
 */

import { SITE_BRAND_NAME, SITE_EMAIL } from "@/lib/site-brand";

export const LEGAL_PAGES_UPDATED_LABEL = "mei 2026";

const p = (blocks: string[]) => blocks.map((html) => `<p>${html}</p>`).join("\n");

export const legalSitePagesSeed = [
  {
    slug: "about",
    path: "/despre-noi",
    title: `Over ons | ${SITE_BRAND_NAME}`,
    heading: "Over ons",
    meta_title: `Over ons | ${SITE_BRAND_NAME}`,
    meta_description: `${SITE_BRAND_NAME} — webshop voor racefietsen, wielrenschoenen, wielen en accessoires. Advies en service in Dedemsvaart.`,
    sort_order: 10,
    body_html: p([
      `<strong>${SITE_BRAND_NAME}</strong> is meer dan een winkel — je sportpartner in Dedemsvaart.`,
      "Wij bieden een exclusieve selectie racefietsen (o.a. Colnago, Cipollini, Orbea, Titici, Sensa), wielen, schoenen en accessoires, met deskundig advies op maat.",
      "Van 2004 tot 2022 was ik professioneel actief in schaatsen en skeeleren. Vandaag help ik atleten en wielrenners met het juiste materiaal — van complete racefiets tot wielen, schoenen of brillen.",
      "Plan vrijblijvend een afspraak via onze <a href=\"/contact\">contactpagina</a>.",
    ]),
  },
  {
    slug: "contact",
    path: "/contact",
    title: `Contact | ${SITE_BRAND_NAME}`,
    heading: "Contact",
    meta_title: `Contact | ${SITE_BRAND_NAME}`,
    meta_description: `Neem contact op met ${SITE_BRAND_NAME} voor bestellingen, levering, retouren en productvragen.`,
    sort_order: 20,
    body_html: `
<ul>
  <li><strong>E-mail:</strong> <a href="mailto:${SITE_EMAIL}">${SITE_EMAIL}</a></li>
  <li><strong>Telefoon:</strong> zie footer</li>
  <li><strong>Adres:</strong> Dedemsvaart (bezoek op afspraak)</li>
  <li><strong>Bereikbaar:</strong> maandag–vrijdag, 09:00 – 17:00</li>
</ul>
<p>We reageren op berichten in volgorde van ontvangst, meestal dezelfde werkdag.</p>
<p>Vermeld bij vragen over je bestelling het <strong>ordernummer</strong> uit de bevestigingsmail.</p>
`.trim(),
  },
  {
    slug: "terms",
    path: "/termeni-si-conditii",
    title: `Algemene voorwaarden | ${SITE_BRAND_NAME}`,
    heading: "Algemene voorwaarden",
    meta_title: `Algemene voorwaarden | ${SITE_BRAND_NAME}`,
    meta_description: `Algemene voorwaarden voor de webshop van ${SITE_BRAND_NAME}.`,
    sort_order: 30,
    body_html: `
<h2>1. Aanbieder</h2>
${p([
  `De webshop wordt beheerd door <strong>${SITE_BRAND_NAME}</strong>. Door een bestelling te plaatsen ga je akkoord met deze voorwaarden.`,
  `Contact: <a href="/contact">contactpagina</a>, e-mail <a href="mailto:${SITE_EMAIL}">${SITE_EMAIL}</a>.`,
])}
<h2>2. Producten en prijzen</h2>
${p([
  "Prijzen zijn in euro (EUR) en inclusief btw, tenzij anders vermeld. Kennelijke prijs- of beschrijffouten kunnen worden gecorrigeerd.",
  "Productafbeeldingen zijn indicatief; kleuren kunnen per scherm afwijken.",
])}
<h2>3. Bestelling en overeenkomst</h2>
${p([
  "De overeenkomst komt tot stand na onze bevestiging (e-mail of telefoon). We kunnen een bestelling weigeren bij uitverkochte voorraad, onvolledige gegevens of vermoeden van fraude.",
])}
<h2>4. Betaling</h2>
${p([
  "Betaalmethoden staan vermeld bij checkout en op de pagina <a href=\"/metode-de-plata\">betaalmethoden</a>.",
])}
<h2>5. Levering</h2>
${p([
  "We leveren in Nederland (en eventueel België, indien aangegeven). Geschatte levertijden staan op de productpagina en bij <a href=\"/livrare-si-retur\">verzending en retour</a>.",
])}
<h2>6. Herroeping</h2>
${p([
  "Consumenten hebben recht op herroeping binnen 14 dagen, conform de wet en ons retourbeleid — zie <a href=\"/livrare-si-retur\">verzending en retour</a>.",
])}
<h2>7. Klachten</h2>
${p([
  "Bij niet-conforme of beschadigde producten: neem binnen 48 uur contact op met foto's en je ordernummer.",
  "Je kunt ook een klacht indienen bij de <a href=\"https://www.consuwijzer.nl/\" target=\"_blank\" rel=\"noopener noreferrer\">geschillencommissie</a> of via het EU ODR-platform.",
])}
<h2>8. Intellectueel eigendom</h2>
${p([
  "Alle content op deze site (teksten, beelden, logo) is beschermd. Reproductie zonder toestemming is niet toegestaan.",
])}
<h2>9. Toepasselijk recht</h2>
${p([
  "Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden bij voorkeur in onderling overleg opgelost.",
])}
`.trim(),
  },
  {
    slug: "privacy",
    path: "/politica-de-confidentialitate",
    title: `Privacybeleid (AVG) | ${SITE_BRAND_NAME}`,
    heading: "Privacybeleid",
    meta_title: `Privacybeleid | ${SITE_BRAND_NAME}`,
    meta_description: `Hoe ${SITE_BRAND_NAME} persoonsgegevens verwerkt: bestellingen, contact, cookies en je AVG-rechten.`,
    sort_order: 40,
    body_html: `
<h2>1. Wie zijn wij</h2>
${p([
  `Verwerkingsverantwoordelijke: <strong>${SITE_BRAND_NAME}</strong>, contact: <a href="mailto:${SITE_EMAIL}">${SITE_EMAIL}</a>.`,
])}
<h2>2. Welke gegevens</h2>
<ul>
  <li>Naam, telefoon, e-mail, afleveradres</li>
  <li>Bestelgegevens: producten, bedrag, leverstatus</li>
  <li>Technische gegevens: IP-adres, browsertype (logs, beveiliging)</li>
  <li>Geaggregeerde analytics (met cookie-toestemming)</li>
</ul>
<h2>3. Doeleinden</h2>
<ul>
  <li>Verwerken en leveren van bestellingen</li>
  <li>Communicatie over je bestelling en klantenservice</li>
  <li>Verbetering en beveiliging van de website</li>
  <li>Marketing — alleen met toestemming</li>
</ul>
<h2>4. Rechtsgrond</h2>
${p([
  "Uitvoering van de overeenkomst, wettelijke verplichtingen, gerechtvaardigd belang (beveiliging) of toestemming (niet-noodzakelijke cookies).",
])}
<h2>5. Bewaartermijn</h2>
${p([
  "Bestelgegevens: conform fiscale bewaarplicht (doorgaans 7 jaar). Marketinggegevens: tot intrekking van toestemming.",
])}
<h2>6. Ontvangers</h2>
${p([
  "Bezorgdiensten, IT-hosting, e-mailproviders — alleen waar nodig en onder verwerkersovereenkomsten.",
])}
<h2>7. Jouw rechten</h2>
<ul>
  <li>Inzage, rectificatie, verwijdering, beperking</li>
  <li>Dataportabiliteit (waar van toepassing)</li>
  <li>Bezwaar en intrekking van toestemming</li>
  <li>Klacht bij de <a href="https://autoriteitpersoonsgegevens.nl/" target="_blank" rel="noopener noreferrer">Autoriteit Persoonsgegevens</a></li>
</ul>
<p>Neem contact op via <a href="mailto:${SITE_EMAIL}">${SITE_EMAIL}</a>.</p>
<h2>8. Cookies</h2>
${p([
  'Zie ook <a href="/politica-cookies">cookiebeleid</a>.',
])}
`.trim(),
  },
  {
    slug: "cookies",
    path: "/politica-cookies",
    title: `Cookiebeleid | ${SITE_BRAND_NAME}`,
    heading: "Cookiebeleid",
    meta_title: `Cookiebeleid | ${SITE_BRAND_NAME}`,
    meta_description: `Welke cookies ${SITE_BRAND_NAME} gebruikt en hoe je voorkeuren beheert.`,
    sort_order: 45,
    body_html: `
${p([
  "We gebruiken cookies en vergelijkbare technieken voor werking, beveiliging en — met toestemming — statistieken en marketing.",
])}
<h2>Soorten cookies</h2>
<ul>
  <li><strong>Noodzakelijk</strong> — winkelwagen, sessie, beveiliging</li>
  <li><strong>Analytisch</strong> — inzicht in sitegebruik (met toestemming)</li>
  <li><strong>Marketing</strong> — campagnes, remarketing (met toestemming)</li>
</ul>
<h2>Beheer</h2>
${p([
  "Je kunt cookies verwijderen of blokkeren in je browser. Sommige functies (winkelwagen) werken dan mogelijk niet goed.",
  'Bij je eerste bezoek kies je categorieën in de cookiebanner; later via "Cookievoorkeuren" in de footer.',
])}
<h2>Meer info</h2>
${p([
  'Zie ook <a href="/politica-de-confidentialitate">privacybeleid</a>.',
])}
`.trim(),
  },
  {
    slug: "shipping",
    path: "/livrare-si-retur",
    title: `Verzending en retour | ${SITE_BRAND_NAME}`,
    heading: "Verzending en retour",
    meta_title: `Verzending en retour | ${SITE_BRAND_NAME}`,
    meta_description: `Levering in Nederland, levertijden en retourbeleid (14 dagen) bij ${SITE_BRAND_NAME}.`,
    sort_order: 50,
    body_html: `
<h2>Verzending</h2>
<ul>
  <li>We verzenden naar adressen in <strong>Nederland</strong> (en eventueel België, indien vermeld).</li>
  <li>Geschatte levertijd: <strong>2–5 werkdagen</strong> na bevestiging (kan in drukke periodes afwijken).</li>
  <li>Verzendkosten worden getoond in de winkelwagen of bij bevestiging.</li>
</ul>
<h2>Ontvangst pakket</h2>
${p([
  "Controleer het pakket bij de bezorger. Bij schade: noteer dit op het formulier en neem binnen 48 uur contact op met foto's.",
])}
<h2>Retour (herroeping)</h2>
<ul>
  <li>Je kunt binnen <strong>14 kalenderdagen</strong> na ontvangst retourneren (consumentenrecht).</li>
  <li>Product ongebruikt, in originele verpakking, labels intact waar van toepassing.</li>
  <li>Neem contact op via <a href="/contact">contact</a> of <a href="mailto:${SITE_EMAIL}">${SITE_EMAIL}</a> voor retourinstructies.</li>
  <li>Terugbetaling binnen <strong>14 dagen</strong> na ontvangst van het retour, via dezelfde betaalmethode of in overleg.</li>
</ul>
<h2>Ruilen</h2>
${p([
  "Voor een andere maat of kleur: plaats een nieuwe bestelling en retourneer het oorspronkelijke product, of neem contact op voor een passende oplossing.",
])}
`.trim(),
  },
  {
    slug: "payment",
    path: "/metode-de-plata",
    title: `Betaalmethoden | ${SITE_BRAND_NAME}`,
    heading: "Betaalmethoden",
    meta_title: `Betaalmethoden | ${SITE_BRAND_NAME}`,
    meta_description: `Beschikbare betaalmethoden bij ${SITE_BRAND_NAME}.`,
    sort_order: 60,
    body_html: p([
      "Beschikbare betaalmethoden staan vermeld bij het afrekenen.",
      "Voor vragen over facturatie of het te betalen bedrag, neem contact op vóór levering.",
    ]),
  },
] as const;
