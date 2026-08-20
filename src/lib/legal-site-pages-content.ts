/**
 * Standaard NL juridische/CMS-teksten voor site_pages seeding.
 */

import { CONTENT_PHOTOS, contentFigure } from "@/lib/content-photos";
import {
  LAFUGA_HEADING,
  LAFUGA_META_DESCRIPTION,
  lafugaBodyHtml,
  lafugaMerkenSectionHtml,
} from "@/lib/lafuga-copy";
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

const ctaRow = (items: { href: string; label: string; primary?: boolean }[]) =>
  `<p class="cms-cta-row">${items
    .map(
      (item) =>
        `<a class="cms-cta${item.primary ? " cms-cta-primary" : ""}" href="${item.href}">${item.label}</a>`,
    )
    .join("")}</p>`;

export type SitePageSeed = {
  slug: string;
  path: string;
  title: string;
  heading: string;
  meta_title: string;
  meta_description: string;
  sort_order: number;
  body_html: string;
  social_image?: string | null;
  image_alt?: string | null;
};

export const legalSitePagesSeed: SitePageSeed[] = [
  {
    slug: "about",
    path: "/over-ons",
    title: `Mijn verhaal | Ingmar Berga`,
    heading: "Mijn verhaal",
    meta_title: `Mijn verhaal | Ingmar Berga — ${SITE_BRAND_NAME} Dedemsvaart`,
    meta_description: `Van topsport naar ${SITE_BRAND_NAME}. Het verhaal van Ingmar Berga: persoonlijk advies, pasvorm en een werkplaats voor race, gravel en MTB in Dedemsvaart.`,
    sort_order: 10,
    social_image: CONTENT_PHOTOS.ingmarPodium.src,
    image_alt: CONTENT_PHOTOS.ingmarPodium.alt,
    body_html: [
      p([
        "<strong>Meer dan een winkel. Je sportpartner.</strong> Bij Bergasports in Dedemsvaart draait alles om prestaties, kwaliteit en persoonlijke service — of je nu fanatiek traint of gewoon zorgeloos wilt rijden.",
        "Mijn naam is Ingmar Berga. Van 2004 tot 2022 stond mijn leven in het teken van topsport. Als marathonschaatser en skeeleraar leerde ik hoe hard materiaal, techniek en begeleiding het verschil maken. Die jaren vormen de basis van Bergasports.",
      ]),
      "<h2>Palmares</h2>",
      "<ul><li>Nederlands kampioen marathonschaatsen op kunstijs — 2007 en 2013</li><li>Open Nederlands kampioen op natuurijs</li><li>Winnaar algemeen klassement KNSB Marathon Cup</li><li>Europees kampioen inline-skaten, marathon — San Benedetto 2010</li><li>Nederlands kampioen skeeleren, marathon — 2019 (plus NK-medailles in 2011, 2015 en 2016)</li></ul>",
      p([
        "Als trainer help ik nog steeds de nieuwe generatie marathonschaatsers. En omdat ik beter dan wie ook weet wat goed materiaal doet, help ik sporters hier in de winkel bij het kiezen van hun uitrusting: een complete racefiets, wielen, Nimbl-schoenen, LaFuga-kleding of een bril die écht past.",
      ]),
      contentFigure("ingmarPodium", "Ingmar Berga op het podium — dezelfde standaard als in de winkel: geen compromis op materiaal."),
      "<h2>Wat heb jij nodig om beter te worden?</h2>",
      p([
        "We verkopen geen standaardpakket. We kijken naar jouw niveau, doelen, rijstijl, lichaam, huidige materiaal en hoe je het daadwerkelijk gebruikt. Race, gravel of mountainbike: het gesprek gaat over jouw ritten, niet over een poster aan de muur.",
        "In Dedemsvaart vind je een selectie merken die we zelf rijden en vertrouwen — onder meer Colnago, Cipollini, Orbea, Titici, Basso, Cervélo, Nimbl, LaFuga, Scope, KASK en Double FF. Daarnaast een werkplaats voor onderhoud, afstelling en upgrades.",
      ]),
      contentFigure("showroom", "Showroom aan de Julianastraat: fietsen, kleding en ruimte om te overleggen."),
      "<h2>Kom langs of plan een afspraak</h2>",
      p([
        "Twijfel je over een frame, schoenmaat of onderhoudsbeurt? Plan vrijblijvend een afspraak. We drinken koffie, kijken naar je fiets en zoeken samen wat werkt.",
      ]),
      ctaRow([
        { href: "/afspraak#formulier", label: "Plan afspraak", primary: true },
        { href: "/shop", label: "Naar de shop" },
        { href: "/onderhoud", label: "Onderhoud" },
      ]),
    ].join("\n"),
  },
  {
    slug: "contact",
    path: "/contact",
    title: `Contact & route | ${SITE_BRAND_NAME}`,
    heading: "Contact & route",
    meta_title: PAGE_SEO.contact.title,
    meta_description: PAGE_SEO.contact.description,
    sort_order: 20,
    social_image: CONTENT_PHOTOS.storefront.src,
    image_alt: CONTENT_PHOTOS.storefront.alt,
    body_html: `
<p>Bij Bergasports ben je welkom voor persoonlijk advies, een vakkundige check van je racefiets of gewoon een goede kop koffie. Nieuwe fiets, onderhoud, Nimbl passen of een snelle vraag — bel, app of kom langs tijdens openingstijden.</p>
${contentFigure("showroom", "Julianastraat 3A, Dedemsvaart — bel aan of plan een afspraak.")}
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
<p>We reageren op berichten in volgorde van ontvangst, meestal dezelfde werkdag. Vermeld bij vragen over je bestelling het <strong>ordernummer</strong> uit de bevestigingsmail.</p>
${ctaRow([
  { href: "/afspraak#formulier", label: "Plan afspraak", primary: true },
  { href: "/shop", label: "Naar de shop" },
])}
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
    meta_description: `Onderhoud, afstelling en reparatie van racefietsen, gravel en MTB in de werkplaats van ${SITE_BRAND_NAME} in Dedemsvaart.`,
    sort_order: 22,
    social_image: CONTENT_PHOTOS.workshopIngmar.src,
    image_alt: CONTENT_PHOTOS.workshopIngmar.alt,
    body_html: [
      p([
        "Een goed onderhouden fiets gaat langer mee, schakelt strakker en is veiliger. In onze werkplaats in Dedemsvaart doen we onderhoud, afstelling en reparaties aan racefietsen, gravel en mountainbikes — met onderdelen van merken die we zelf vertrouwen.",
        "Of je een basischeck nodig hebt, tubeless wilt laten zetten of een specifieke storing hebt: we kijken eerst naar de fiets en geven daarna een helder advies. Geen verrassingen, wel vakwerk.",
      ]),
      "<h2>Regulier onderhoud</h2>",
      p([
        "Van een korte controle tot een uitgebreide beurt. Denk aan versnellingen en remmen, ketting en aandrijving, banden en tubeless sealant, spaken en wieluitlijning, lagers en alle bouten nalopen. Na afloop is je fiets schoon, afgesteld en klaar voor de volgende blokken.",
      ]),
      "<ul><li>Kleine of grote onderhoudsbeurt</li><li>Versnellingen en remmen afstellen</li><li>Aandrijving ontvetten en smeren</li><li>Banden en tubeless</li><li>Wielen, cassette en montage</li><li>Hydraulische remmen spoelen</li></ul>",
      contentFigure("workshopStand", "Hoogwaardige racefietsen horen op een echte montagestandaard — niet tegen de muur."),
      "<h2>Reparatie en upgrades</h2>",
      p([
        "Kabelbreuk, slecht schakelen, een beschadigd onderdeel of een wiel dat niet meer rond loopt: we lossen het op. Wil je tegelijk upgraden — wielen, groepset, cockpit of zadel — dan denken we mee over wat past bij jouw rijstijl en budget.",
        "Prijzen zijn afhankelijk van de fiets en het werk. Onderdelen en meerwerk rekenen we apart. Bij je afspraak hoor je vooraf wat we gaan doen.",
      ]),
      "<h2>Breng je fiets langs</h2>",
      p([
        "Plan een afspraak zodat we tijd voor je vrijhouden. Liever even overleggen? Bel of WhatsApp. We laten je weten wanneer de fiets klaarstaat.",
      ]),
      ctaRow([
        { href: "/afspraak#formulier", label: "Plan onderhoud", primary: true },
        { href: "/contact", label: "Contact" },
        { href: "/shop", label: "Onderdelen in de shop" },
      ]),
    ].join("\n"),
  },
  {
    slug: "afspraak",
    path: "/afspraak",
    title: `Maak een afspraak | ${SITE_BRAND_NAME}`,
    heading: "Maak een afspraak",
    meta_title: `Afspraak in de winkel | ${SITE_BRAND_NAME} Dedemsvaart`,
    meta_description: `Plan een afspraak bij ${SITE_BRAND_NAME} in Dedemsvaart voor advies, Nimbl of LaFuga passen, of onderhoud.`,
    sort_order: 23,
    social_image: CONTENT_PHOTOS.storefront.src,
    image_alt: CONTENT_PHOTOS.storefront.alt,
    body_html: [
      p([
        "Persoonlijk advies werkt het best als we tijd voor je hebben. Plan een afspraak voor een nieuwe fiets, Nimbl-schoenen of LaFuga-kleding passen, een onderhoudsbeurt of een upgrade. We reageren meestal dezelfde werkdag.",
        "Kom je voor een fietsadvies? Neem je huidige fiets of schoenen mee als je die hebt. Zo zien we meteen wat je nu rijdt en wat er beter kan.",
      ]),
      "<h2>Waarvoor kun je terecht?</h2>",
      "<ul><li>Advies over race, gravel of mountainbike</li><li>Nimbl wielrenschoenen passen</li><li>LaFuga kleding en pasvorm</li><li>Onderhoud en reparatie inplannen</li><li>Wielen, onderdelen en upgrades</li></ul>",
      p([
        "Liever spontaan langskomen tijdens openingstijden? Dat kan, maar een afspraak geeft zekerheid dat Ingmar er is.",
      ]),
      ctaRow([
        { href: "/shop", label: "Eerst de shop bekijken" },
        { href: "/contact", label: "Contact & route" },
      ]),
    ].join("\n"),
  },
  {
    slug: "merken",
    path: "/merken",
    title: `Merken | ${SITE_BRAND_NAME}`,
    heading: "Onze merken",
    meta_title: `Merken: Colnago, Nimbl, KASK, Double FF | ${SITE_BRAND_NAME}`,
    meta_description: `Ontdek de merken bij ${SITE_BRAND_NAME}: racefietsen, Nimbl-schoenen, KASK-helmen, Double FF skeelers en LaFuga-kleding.`,
    sort_order: 24,
    social_image: CONTENT_PHOTOS.ingmarNimbl.src,
    image_alt: CONTENT_PHOTOS.ingmarNimbl.alt,
    body_html: [
      p([
        `Bij ${SITE_BRAND_NAME} kies je uit merken die we zelf rijden en in de werkplaats onderhouden. Geen eindeloze muur met alles — wel een scherpe selectie voor race, gravel en mountainbike, plus schoenen en kleding die je hier kunt passen.`,
      ]),
      "<h2>Fietsen en frames</h2>",
      p([
        "Colnago, Cipollini, Orbea, Titici, Basso, Cervélo en Sensa. Van een aerodynamische racer tot een gravelbike waarmee je het weekend in gaat: we helpen je het frame kiezen dat bij jouw ritten past.",
      ]),
      "<h2>Wielen, schoenen, kleding en helmen</h2>",
      p([
        'Wielen van merken als Scope, Ere en Campagnolo. <a href="/nimbl">Nimbl</a> wielrenschoenen — Italiaans, licht, en op voorraad om te passen. Helmen van <strong>KASK</strong> — van Mojito tot Protone Icon — passen we hier in Dedemsvaart.',
      ]),
      lafugaMerkenSectionHtml(),
      "<h2>Skeelers: Double FF</h2>",
      p([
        "Double FF is ons skeelermerk: boots, frames, wielen en lagers uit Italië. Dezelfde standaard als op de fiets: passen, afstellen, en alleen meenemen wat je écht nodig hebt.",
      ]),
      contentFigure("showroom", "Merken die je hier ziet hangen, kun je ook netjes laten onderhouden."),
      p([
        "Twijfel je tussen twee merken of maten? Plan een afspraak. We zetten de fietsen of schoenen klaar en nemen de tijd.",
      ]),
      ctaRow([
        { href: "/shop", label: "Bekijk de shop", primary: true },
        { href: "/afspraak#formulier", label: "Plan afspraak" },
        { href: "/nimbl", label: "Nimbl" },
        { href: "/lafuga", label: "LaFuga custom kleding" },
      ]),
    ].join("\n"),
  },
  {
    slug: "lafuga",
    path: "/lafuga",
    title: `${LAFUGA_HEADING} | ${SITE_BRAND_NAME}`,
    heading: LAFUGA_HEADING,
    meta_title: `${LAFUGA_HEADING} | ${SITE_BRAND_NAME}`,
    meta_description: LAFUGA_META_DESCRIPTION,
    sort_order: 25,
    social_image: CONTENT_PHOTOS.showroom.src,
    image_alt: CONTENT_PHOTOS.showroom.alt,
    body_html: lafugaBodyHtml(),
  },
  {
    slug: "nimbl",
    path: "/nimbl",
    title: `Nimbl | ${SITE_BRAND_NAME}`,
    heading: "Nimbl",
    meta_title: `Nimbl wielrenschoenen | ${SITE_BRAND_NAME}`,
    meta_description: `Nimbl wielrenschoenen bij ${SITE_BRAND_NAME}. Passen en advies in Dedemsvaart.`,
    sort_order: 26,
    social_image: CONTENT_PHOTOS.ingmarNimbl.src,
    image_alt: CONTENT_PHOTOS.ingmarNimbl.alt,
    body_html: [
      p([
        "Nimbl maakt lichte, stijve wielrenschoenen voor op de weg. Bij Bergasports passen we ze in de winkel: de juiste maat en sluiting maken meer verschil dan een extra gram op papier.",
        "Of je een eerste performance-schoen zoekt of een upgrade naar Italiaans maatwerk-gevoel: we nemen de tijd. Een deel van de collectie is op voorraad; speciale kleuren of maten bestellen we voor je.",
      ]),
      ctaRow([
        { href: "/afspraak#formulier", label: "Nimbl passen", primary: true },
        { href: "/shop", label: "Nimbl in de shop" },
        { href: "/merken", label: "Alle merken" },
      ]),
    ].join("\n"),
  },
];

/**
 * Pagina's die niet meer bestaan maar wel in de database kunnen staan.
 * De seed zet ze op niet-gepubliceerd, zodat ze uit de sitemap verdwijnen.
 */
export const retiredSitePageSlugs = ["shipping"] as const;

export function getSitePageSeedByPath(path: string): SitePageSeed | undefined {
  return legalSitePagesSeed.find((page) => page.path === path);
}
