/**
 * Standaard NL juridische/CMS-teksten voor site_pages seeding.
 */

import { SITE_BRAND_NAME, SITE_EMAIL } from "@/lib/site-brand";
import { SHOP_PHONE_LABEL, shopPhoneTelHref } from "@/lib/site-contact";
import {
  LEGAL_PAGE_PATHS,
  PAGE_SEO,
  SHOP_MAPS_URL,
  SHOP_OPENING_HOURS,
  SITE_ADDRESS,
} from "@/lib/site-content";

export const LEGAL_PAGES_UPDATED_LABEL = "mei 2026";

const p = (blocks: string[]) => blocks.map((html) => `<p>${html}</p>`).join("\n");

export const legalSitePagesSeed = [
  {
    slug: "about",
    path: "/over-ons",
    title: `Mijn verhaal | Ingmar Berga`,
    heading: "Mijn verhaal",
    meta_title: `Mijn verhaal | Ingmar Berga — ${SITE_BRAND_NAME} Dedemsvaart`,
    meta_description: `Van topsport naar ${SITE_BRAND_NAME}. Het verhaal van Ingmar Berga: persoonlijk advies, hoogwaardig materiaal en jarenlange ervaring in Dedemsvaart.`,
    sort_order: 10,
    body_html: p([
      "<strong>Meer dan een winkel. Je sportpartner.</strong>",
      "Mijn naam is Ingmar Berga. Van 2004 tot 2022 stond mijn leven in het teken van topsport. Als professioneel schaatser en skeeleraar heb ik ervaren hoe belangrijk materiaal, techniek en persoonlijke begeleiding zijn.",
      `Die ervaring vormt de basis van ${SITE_BRAND_NAME}. Bij het leveren van sportmateriaal draait het niet alleen om een product verkopen — het gaat om de vraag: <em>Wat heb jij nodig om beter te worden?</em>`,
      "Daarom kijken we naar jouw niveau, doelen, rijstijl, lichaam, huidige materiaal en hoe je het daadwerkelijk gebruikt.",
      'Plan vrijblijvend een afspraak via onze <a href="/contact">contactpagina</a>.',
    ]),
  },
  {
    slug: "contact",
    path: "/contact",
    title: `Contact & route | ${SITE_BRAND_NAME}`,
    heading: "Contact & route",
    meta_title: PAGE_SEO.contact.title,
    meta_description: PAGE_SEO.contact.description,
    sort_order: 20,
    body_html: `
<h2>Contactgegevens</h2>
<ul>
  <li><strong>Adres:</strong> ${SITE_ADDRESS}</li>
  <li><strong>Telefoon:</strong> <a href="${shopPhoneTelHref()}">${SHOP_PHONE_LABEL}</a></li>
  <li><strong>E-mail:</strong> <a href="mailto:${SITE_EMAIL}">${SITE_EMAIL}</a></li>
  <li><strong>Route:</strong> <a href="${SHOP_MAPS_URL}" target="_blank" rel="noopener noreferrer">open in Google Maps</a></li>
</ul>
<h2>Openingstijden</h2>
<table>
<tbody>
${SHOP_OPENING_HOURS.map((row) => `  <tr><td>${row.day}</td><td>${row.hours}</td></tr>`).join("\n")}
</tbody>
</table>
<p>Kom langs voor persoonlijk advies, een vakkundige check van je racefiets of gewoon een goede kop koffie.</p>
<p>We reageren op berichten in volgorde van ontvangst, meestal dezelfde werkdag. Vermeld bij vragen over je bestelling het <strong>ordernummer</strong> uit de bevestigingsmail.</p>
`.trim(),
  },
  {
    slug: "terms",
    path: LEGAL_PAGE_PATHS.terms,
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
  `Betaalmethoden staan vermeld bij checkout en op de pagina <a href="${LEGAL_PAGE_PATHS.payment}">betaalmethoden</a>.`,
])}
<h2>5. Levering</h2>
${p([
  `We leveren in Nederland (en eventueel België, indien aangegeven). Geschatte levertijden staan op de productpagina en bij <a href="${LEGAL_PAGE_PATHS.shipping}">verzending en bezorging</a>.`,
])}
<h2>6. Herroeping</h2>
${p([
  `Consumenten hebben recht op herroeping binnen 14 dagen, conform de wet en ons retourbeleid — zie <a href="${LEGAL_PAGE_PATHS.returns}">retourneren</a>.`,
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
    path: LEGAL_PAGE_PATHS.privacy,
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
  `Zie ook <a href="${LEGAL_PAGE_PATHS.cookies}">cookiebeleid</a>.`,
])}
`.trim(),
  },
  {
    slug: "cookies",
    path: LEGAL_PAGE_PATHS.cookies,
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
  `Zie ook <a href="${LEGAL_PAGE_PATHS.privacy}">privacybeleid</a>.`,
])}
`.trim(),
  },
  {
    slug: "payment",
    path: LEGAL_PAGE_PATHS.payment,
    title: `Betaalmethoden | ${SITE_BRAND_NAME}`,
    heading: "Betaalmethoden",
    meta_title: `Veilig betalen: iDEAL, Apple Pay & creditcard | ${SITE_BRAND_NAME}`,
    meta_description: `Betaal je bestelling bij ${SITE_BRAND_NAME} veilig met iDEAL, Apple Pay, Google Pay, Bancontact of creditcard via Mollie.`,
    sort_order: 60,
    body_html: `
${p([
  "Je rekent veilig af via Mollie. Je betaalgegevens komen nooit bij ons terecht.",
])}
<h2>Beschikbare betaalmethoden</h2>
<ul>
  <li><strong>iDEAL</strong> — direct via je eigen bank</li>
  <li><strong>Apple Pay</strong> en <strong>Google Pay</strong></li>
  <li><strong>Creditcard</strong> — Visa en Mastercard</li>
  <li><strong>Bancontact</strong> — voor Belgische klanten</li>
  <li><strong>In de winkel</strong> — pin of contant bij afhalen in Dedemsvaart</li>
</ul>
<h2>Facturatie</h2>
${p([
  `Je ontvangt de factuur per e-mail bij de bestelbevestiging. Vragen over een bedrag of factuur? Mail <a href="mailto:${SITE_EMAIL}">${SITE_EMAIL}</a> met je ordernummer.`,
])}
<h2>Meer weten</h2>
${p([
  `Bekijk ook <a href="${LEGAL_PAGE_PATHS.shipping}">verzending en bezorging</a> en <a href="${LEGAL_PAGE_PATHS.returns}">retourneren</a>.`,
])}
`.trim(),
  },
  {
    slug: "onderhoud",
    path: "/onderhoud",
    title: `Onderhoud & reparatie | ${SITE_BRAND_NAME}`,
    heading: "Onderhoud & reparatie",
    meta_title: `Onderhoud & reparatie racefiets | ${SITE_BRAND_NAME}`,
    meta_description: `Onderhoud, afstelling en reparatie van racefietsen, gravel en MTB in Dedemsvaart.`,
    sort_order: 22,
    body_html: p([
      "<strong>Goed materiaal begint met goed onderhoud.</strong>",
      "Wij helpen met onderhoud, afstelling en reparaties aan racefietsen en andere fietsen.",
    ]) +
      `<ul><li>Onderhoudsbeurt</li><li>Versnellingen afstellen</li><li>Remmen</li><li>Banden / tubeless</li><li>Wielmontage</li><li>Onderdelen vervangen</li></ul>` +
      p(['Wil je weten wat jouw fiets nodig heeft? <a href="/afspraak">Maak een afspraak</a>.']),
  },
  {
    slug: "afspraak",
    path: "/afspraak",
    title: `Maak een afspraak | ${SITE_BRAND_NAME}`,
    heading: "Maak een afspraak",
    meta_title: `Afspraak in de winkel | ${SITE_BRAND_NAME} Dedemsvaart`,
    meta_description: `Plan een afspraak bij ${SITE_BRAND_NAME} in Dedemsvaart voor advies, pasvorm of onderhoud.`,
    sort_order: 23,
    body_html: p([
      "Kom langs voor persoonlijk advies, een pasafspraak of onderhoud. Vul het formulier in of bel ons.",
      "We reageren meestal dezelfde werkdag.",
    ]),
  },
  {
    slug: "merken",
    path: "/merken",
    title: `Merken | ${SITE_BRAND_NAME}`,
    heading: "Onze merken",
    meta_title: `Merken: Colnago, Cipollini, Orbea, Nimbl, LaFuga | ${SITE_BRAND_NAME}`,
    meta_description: `Ontdek de merken bij ${SITE_BRAND_NAME}: racefietsen, kleding en schoenen van topmerken.`,
    sort_order: 24,
    body_html: p([
      `Bij ${SITE_BRAND_NAME} kies je uit merken die we zelf rijden en vertrouwen.`,
      '<a href="/shop">Bekijk de shop</a> of lees meer over <a href="/lafuga">LaFuga</a> en <a href="/nimbl">Nimbl</a>.',
    ]),
  },
  {
    slug: "lafuga",
    path: "/lafuga",
    title: `LaFuga | ${SITE_BRAND_NAME}`,
    heading: "LaFuga",
    meta_title: `LaFuga fietskleding | ${SITE_BRAND_NAME}`,
    meta_description: `LaFuga wielrenkleding bij ${SITE_BRAND_NAME} in Dedemsvaart. Advies en pasvorm in de winkel.`,
    sort_order: 25,
    body_html: p([
      "LaFuga maakt wielrenkleding voor renners die comfort en prestaties combineren.",
      'Bekijk <a href="/shop">LaFuga in de shop</a> of <a href="/afspraak">maak een pasafspraak</a>.',
    ]),
  },
  {
    slug: "nimbl",
    path: "/nimbl",
    title: `Nimbl | ${SITE_BRAND_NAME}`,
    heading: "Nimbl",
    meta_title: `Nimbl wielrenschoenen | ${SITE_BRAND_NAME}`,
    meta_description: `Nimbl wielrenschoenen bij ${SITE_BRAND_NAME}. Passen en advies in Dedemsvaart.`,
    sort_order: 26,
    body_html: p([
      "Nimbl maakt lichte, stijve wielrenschoenen voor op de weg.",
      'Kom passen in Dedemsvaart of bekijk het aanbod in de <a href="/shop">shop</a>.',
    ]),
  },
] as const;

/**
 * Pagina's die niet meer bestaan maar wel in de database kunnen staan.
 * De seed zet ze op niet-gepubliceerd, zodat ze uit de sitemap verdwijnen.
 */
export const retiredSitePageSlugs = ["shipping"] as const;
