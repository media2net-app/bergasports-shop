/**
 * Locale-aware category copy: short intro (above grid) + long body (below grid).
 * Admin DB overrides (translations[locale]) take precedence when present.
 */

import { toCanonicalWcSlug } from "@/lib/category-slugs";
import { LAFUGA_META_DESCRIPTION, LAFUGA_SEO_INTRO } from "@/lib/lafuga-copy";
import { SITE_BRAND_NAME, SITE_BRAND_SHORT } from "@/lib/site-brand";

export type CategoryCopy = {
  /** Short intro above the product grid. */
  intro: string;
  /** Longer SEO body paragraphs below the grid. */
  body: string[];
  seoDescription: string;
};

const ADVICE_NL = `Persoonlijk advies vanuit Dedemsvaart.`;
const ADVICE_EN = `Personal advice from Dedemsvaart.`;

function copy(
  intro: string,
  body: string[],
  seoDescription: string,
): CategoryCopy {
  return { intro, body, seoDescription };
}

const COPY_NL: Record<string, CategoryCopy> = {
  bikes: copy(
    `Racefietsen, gravelbikes en mountainbikes van merken die we zelf rijden — Orbea, Colnago, Basso, Cervélo en meer. ${ADVICE_NL}`,
    [
      `Bergasports is dé fietsenwinkel in Dedemsvaart voor serieuze fietsers. Je vindt hier racefietsen, gravelbikes en mountainbikes — geselecteerd op kwaliteit, pasvorm en rijeigenschappen.`,
      `Met ervaring in schaats- én wielersport weten we hoe belangrijk goed materiaal is. Ons team helpt je bij maat, groepset, wielen en setup, afgestemd op jouw doelen.`,
      `Bestel online of kom langs in Dedemsvaart. We leveren in Nederland en België en denken mee tot je fiets echt bij je past.`,
    ],
    `Fietsen kopen bij ${SITE_BRAND_NAME}: race, gravel en MTB. ${ADVICE_NL}`,
  ),
  "road-bike": copy(
    `High-end racefietsen van Colnago, Cipollini, Orbea, Basso, Cervélo en meer — met advies over maat, groepset en wielen vanuit Dedemsvaart.`,
    [
      `Bij Bergasports vind je exclusieve racefietsen van topmerken als Colnago en Cipollini, plus Orbea, Basso, Cervélo, Titici en Sensa. Gericht op prestatie, comfort en duurzaamheid — van criterium tot lange tochten.`,
      `Colnago staat voor Italiaans vakmanschap en race-erfgoed; Cipollini voor aerodynamica en snelheid. Orbea en Basso bieden sterke prijs-kwaliteit voor training en wedstrijd. We denken mee over framemaat, groepset en wielset.`,
      `Bestel online of kom langs in Dedemsvaart voor persoonlijk advies. We leveren in Nederland en België.`,
    ],
    `Racefietsen kopen bij ${SITE_BRAND_NAME}: Colnago, Cipollini, Orbea & meer.`,
  ),
  gravelbike: copy(
    `Van snelle gravelraces tot lange avonturen: kies een gravelbike die past bij jouw terrein en rijstijl. ${ADVICE_NL}`,
    [
      `Gravelbikes combineren snelheid op asfalt met grip en comfort op onverhard. Ideaal voor mixed routes, endurance en bikepacking.`,
      `We adviseren over bandenkeuze, geometry en groepset — afgestemd op of je vooral race, avontuur of woon-werk rijdt.`,
      `Bekijk het assortiment online of plan een bezoek aan onze zaak in Dedemsvaart.`,
    ],
    `Gravelbikes kopen bij ${SITE_BRAND_NAME}. ${ADVICE_NL}`,
  ),
  "gravel-bike": copy(
    `Van snelle gravelraces tot lange avonturen: kies een gravelbike die past bij jouw terrein en rijstijl. ${ADVICE_NL}`,
    [
      `Gravelbikes combineren snelheid op asfalt met grip en comfort op onverhard.`,
      `Advies over banden, geometry en setup vanuit Dedemsvaart.`,
    ],
    `Gravelbikes kopen bij ${SITE_BRAND_NAME}. ${ADVICE_NL}`,
  ),
  mtb: copy(
    `Performance mountainbikes voor cross-country, trails en technische parcoursen. ${ADVICE_NL}`,
    [
      `Onze MTB’s zijn gericht op controle, grip en duurzaamheid — van XC tot trail.`,
      `We helpen je met demping, wielmaat en componentenkeuze, passend bij jouw routes en niveau.`,
      `Shop online of kom langs voor persoonlijk advies in Dedemsvaart.`,
    ],
    `Mountainbikes (MTB) kopen bij ${SITE_BRAND_NAME}. ${ADVICE_NL}`,
  ),
  "used-bikes": copy(
    `Gecontroleerde tweedehands racefietsen, nagekeken in onze eigen werkplaats. ${ADVICE_NL}`,
    [
      `Tweedehands betekent bij ons niet “zomaar gebruikt”: elke fiets wordt nagekeken en beoordeeld in onze werkplaats.`,
      `Ideaal als je premium kwaliteit zoekt tegen een scherpere prijs — met eerlijk advies over staat en restwaarde.`,
    ],
    `Tweedehands racefietsen bij ${SITE_BRAND_NAME}.`,
  ),
  "speed-skates": copy(
    `Skeelers, schoenen, frames, wielen en lagers voor training en wedstrijd. Advies van oud-topsporter Ingmar Berga uit Dedemsvaart.`,
    [
      `Als skeelerspecialist bieden we complete sets én losse onderdelen: schoenen, frames, wielen en lagers.`,
      `Ingmar Berga en het team helpen je met setup en materiaalkeuze — van beginnende racer tot topniveau.`,
      `Kies hieronder een subcategorie of bekijk het volledige skeelerassortiment.`,
    ],
    `Skeelers en skeelermateriaal bij ${SITE_BRAND_NAME}. ${ADVICE_NL}`,
  ),
  "complete-skates": copy(
    `Complete skeelersets — klaar om te rijden, met frame, schoenen en wielen op elkaar afgestemd.`,
    [
      `Een complete set bespaart zoekwerk: schoenen, frame en wielen zijn op elkaar afgestemd voor jouw niveau.`,
      `Twijfel je tussen maten of setup? We passen en adviseren in Dedemsvaart.`,
    ],
    `Complete skeelers kopen bij ${SITE_BRAND_NAME}.`,
  ),
  "skate-shoes": copy(
    `Skeelerschoenen en raceboots voor inline speed skating. Passen en advies in Dedemsvaart.`,
    [
      `De juiste boot bepaalt comfort en krachtoverdracht. We helpen bij maat, breedte en voorkeur (carbon, fit).`,
      `Combineer met een passend frame en wielen voor een complete setup.`,
    ],
    `Skeelerschoenen kopen bij ${SITE_BRAND_NAME}.`,
  ),
  "skate-wheels": copy(
    `Skeelerwielen in verschillende diameters en compounds voor training en wedstrijd.`,
    [
      `Wielen bepalen grip, rol en slijtage. Kies compound en diameter op basis van ondergrond en seizoen.`,
      `Advies over sets en vervanging krijg je graag in de zaak of via contact.`,
    ],
    `Skeelerwielen kopen bij ${SITE_BRAND_NAME}.`,
  ),
  "skate-bearings": copy(
    `Keramische en stalen lagers voor skeelerwielen — minder rolweerstand, meer snelheid. ${ADVICE_NL}`,
    [
      `Goede lagers houden je wielen soepel. Keramiek voor lage weerstand, staal voor duurzame trainingsets.`,
      `We adviseren welke lagers passen bij jouw wielen en gebruik.`,
    ],
    `Skeelerlagers kopen bij ${SITE_BRAND_NAME}.`,
  ),
  wheels: copy(
    `De juiste wielset verandert het karakter van je fiets. Carbon wielsets van Scope en meer — voor race, gravel en performance.`,
    [
      `Wielen bepalen acceleratie, stabiliteit en comfort. We bieden carbon wielsets voor race en gravel, inclusief Scope.`,
      `Twijfel je tussen diepte, naafstand of tubeless? We denken mee over wat past bij jouw fiets en routes.`,
      `Bekijk ook onze Scope Outlet voor scherpe deals met garantie.`,
    ],
    `Wielen & wielsets kopen bij ${SITE_BRAND_NAME}. ${ADVICE_NL}`,
  ),
  "scope-outlet": copy(
    `Scope carbon wielsets met outletvoordeel, met volledige garantie. ${ADVICE_NL}`,
    [
      `Scope outlet: scherpe prijzen op geselecteerde carbon wielsets, zonder in te leveren op garantie.`,
      `Check beschikbaarheid en maten online, of vraag ons om de juiste set voor jouw racefiets of gravelbike.`,
    ],
    `Scope wielen outlet bij ${SITE_BRAND_NAME}.`,
  ),
  "cycling-shoes": copy(
    `Fietsschoenen van Nimbl en andere topmerken — licht, stijf en te passen in Dedemsvaart.`,
    [
      `Een goede fietsschoen is stijf, licht en past precies. Nimbl en andere merken in ons assortiment zijn gericht op performance.`,
      `Kom passen in Dedemsvaart: we kijken naar breedte, volume en schoenplaatjes-stand.`,
      `Bestel online als je jouw maat kent — of plan een afspraak voor persoonlijk advies.`,
    ],
    `Fietsschoenen kopen bij ${SITE_BRAND_NAME}: Nimbl & meer.`,
  ),
  "lafuga-wear": copy(
    LAFUGA_SEO_INTRO,
    [
      `Met LaFuga brengt Bergasports fietskleding waarin design, prestaties en kwaliteit samenkomen — designed by Ingmar Berga.`,
      `In de shop vind je de standaardcollectie. Voor clubs, bedrijven en teams maken we custom kleding op maat.`,
      `Kies hier je items of ga naar de LaFuga maatwerk-pagina voor een teamaanvraag.`,
    ],
    LAFUGA_META_DESCRIPTION,
  ),
  accessories: copy(
    `Helmen, brillen, schoenplaatjes, groepsets en alle andere fietsaccessoires. ${ADVICE_NL}`,
    [
      `Accessoires maken je setup af: helmen, brillen, plaatjes en groepsets — geselecteerd op kwaliteit en gebruikscomfort.`,
      `We helpen je met maat, compatibiliteit en wat écht nodig is voor jouw fiets.`,
    ],
    `Fietsaccessoires kopen bij ${SITE_BRAND_NAME}.`,
  ),
  glasses: copy(
    `Sportbrillen en fietsbrillen met heldere lenzen en een goede pasvorm. ${ADVICE_NL}`,
    [
      `Goede fietsbrillen beschermen tegen wind, stof en UV — met lenzen die passen bij lichtomstandigheden.`,
      `Advies over pasvorm en lenskeuze in Dedemsvaart of via de webshopfilters.`,
    ],
    `Sportbrillen & fietsbrillen bij ${SITE_BRAND_NAME}.`,
  ),
  "cycling-helmets": copy(
    `Fietshelmen van onder andere KASK — met de juiste maat en ventilatie. ${ADVICE_NL}`,
    [
      `Veiligheid en comfort beginnen bij de juiste helm. We helpen met maat, pasvorm en ventilatie.`,
      `KASK en andere merken in ons assortiment zijn gericht op race en performance.`,
    ],
    `Fietshelmen kopen bij ${SITE_BRAND_NAME}.`,
  ),
  cleats: copy(
    `Schoenplaatjes voor Shimano, Look en Wahoo — inclusief advies over de juiste stand.`,
    [
      `De juiste plaatjes en stand voorkomen knieklachten en verbeteren krachtoverdracht.`,
      `We adviseren welk systeem bij jouw schoenen en pedalen past.`,
    ],
    `Schoenplaatjes kopen bij ${SITE_BRAND_NAME}.`,
  ),
  "group-sets": copy(
    `Complete groepsets en onderdelen voor je racefiets of gravelbike.`,
    [
      `Van complete groepsets tot losse onderdelen: we helpen met compatibiliteit en upgrade-paden.`,
      `Twijfel tussen 2× of 1×, of elektronisch vs. mechanisch? Vraag ons om advies.`,
    ],
    `Groepsets kopen bij ${SITE_BRAND_NAME}.`,
  ),
  "schoenen-kleding": copy(
    `Fietsschoenen van Nimbl en fietskleding van LaFuga — te passen en te kiezen in Dedemsvaart.`,
    [
      `Bij ${SITE_BRAND_SHORT} vind je fietsschoenen en wielrenkleding onder één dak: Nimbl (en andere merken) voor de pasvorm, LaFuga voor shirts, broeken en custom kits.`,
      `Kies via de subcategorieën Fietsschoenen of Kleding, of bekijk alles hier. Past jouw maat? Kom langs in Dedemsvaart.`,
      `Custom LaFuga-teamkits via /lafuga — de shopcollectie bestel je online.`,
    ],
    `Fietsschoenen & kleding bij ${SITE_BRAND_NAME}.`,
  ),
};

const COPY_EN: Record<string, CategoryCopy> = {
  bikes: copy(
    `Road, gravel and mountain bikes from brands we ride ourselves — Orbea, Colnago, Basso, Cervélo and more. ${ADVICE_EN}`,
    [
      `${SITE_BRAND_SHORT} in Dedemsvaart is your destination for serious bikes: road, gravel and MTB — selected for quality, fit and ride feel.`,
      `With roots in skating and cycling, we know how much the right setup matters. We’ll help with size, groupset, wheels and fit.`,
      `Order online or visit us in Dedemsvaart. We ship across the Netherlands and Belgium.`,
    ],
    `Buy bikes at ${SITE_BRAND_NAME}: road, gravel and MTB. ${ADVICE_EN}`,
  ),
  "road-bike": copy(
    `High-end road bikes for riders who want more from their gear. At ${SITE_BRAND_SHORT} you’ll find Colnago, Cipollini, Orbea, Basso, Cervélo and more — with advice on size, groupset and wheels.`,
    [
      `Our road bikes are chosen for stiffness, weight and handling — from criteriums to long days in the saddle.`,
      `We help with frame size, groupset (Shimano, SRAM, Campagnolo) and wheelsets so your setup matches training and racing.`,
      `Want to see a bike in person? Visit Dedemsvaart or contact us for advice.`,
    ],
    `Buy road bikes at ${SITE_BRAND_NAME}. Expert advice from Dedemsvaart.`,
  ),
  gravelbike: copy(
    `From fast gravel races to long adventures: choose a gravel bike that matches your terrain and riding style. ${ADVICE_EN}`,
    [
      `Gravel bikes blend road speed with off-road grip and comfort — ideal for mixed routes, endurance and bikepacking.`,
      `We’ll advise on tyre choice, geometry and groupset based on how you ride.`,
      `Browse online or plan a visit to our shop in Dedemsvaart.`,
    ],
    `Buy gravel bikes at ${SITE_BRAND_NAME}. ${ADVICE_EN}`,
  ),
  "gravel-bike": copy(
    `From fast gravel races to long adventures: choose a gravel bike that matches your terrain and riding style. ${ADVICE_EN}`,
    [
      `Gravel bikes blend road speed with off-road grip and comfort.`,
      `Advice on tyres, geometry and setup from Dedemsvaart.`,
    ],
    `Buy gravel bikes at ${SITE_BRAND_NAME}. ${ADVICE_EN}`,
  ),
  mtb: copy(
    `Performance mountain bikes for cross-country, trails and technical courses. ${ADVICE_EN}`,
    [
      `Our MTBs focus on control, grip and durability — from XC to trail.`,
      `We’ll help with suspension, wheel size and components for your routes and level.`,
      `Shop online or visit us in Dedemsvaart for personal advice.`,
    ],
    `Buy mountain bikes (MTB) at ${SITE_BRAND_NAME}. ${ADVICE_EN}`,
  ),
  "used-bikes": copy(
    `Checked used road bikes, inspected in our own workshop. ${ADVICE_EN}`,
    [
      `Used doesn’t mean unchecked: every bike is inspected in our workshop.`,
      `A smart way to get premium quality at a sharper price — with honest advice on condition.`,
    ],
    `Used road bikes at ${SITE_BRAND_NAME}.`,
  ),
  "speed-skates": copy(
    `Speed skates, boots, frames, wheels and bearings for training and racing. Advice from former elite athlete Ingmar Berga in Dedemsvaart.`,
    [
      `As a skating specialist we offer complete sets and individual parts: boots, frames, wheels and bearings.`,
      `Ingmar Berga and the team help with setup — from developing racers to elite level.`,
      `Pick a subcategory below or browse the full skating range.`,
    ],
    `Speed skates and skating gear at ${SITE_BRAND_NAME}. ${ADVICE_EN}`,
  ),
  "complete-skates": copy(
    `Complete speed skate packages — ready to ride, with frame, boots and wheels matched together.`,
    [
      `A complete set saves guesswork: boots, frame and wheels matched to your level.`,
      `Unsure about size or setup? We fit and advise in Dedemsvaart.`,
    ],
    `Buy complete speed skates at ${SITE_BRAND_NAME}.`,
  ),
  "skate-shoes": copy(
    `Inline speed skating boots — fit and advice in Dedemsvaart.`,
    [
      `The right boot drives comfort and power transfer. We help with size, width and carbon preference.`,
      `Pair with a matching frame and wheels for a complete setup.`,
    ],
    `Buy skate shoes at ${SITE_BRAND_NAME}.`,
  ),
  "skate-wheels": copy(
    `Inline skate wheels in different diameters and compounds for training and racing.`,
    [
      `Wheels set grip, roll and wear. Choose compound and diameter for surface and season.`,
      `Ask us for advice on sets and replacements.`,
    ],
    `Buy skate wheels at ${SITE_BRAND_NAME}.`,
  ),
  "skate-bearings": copy(
    `Ceramic and steel bearings for skate wheels — lower rolling resistance, higher speed. ${ADVICE_EN}`,
    [
      `Quality bearings keep wheels spinning smoothly. Ceramic for low resistance, steel for durable training sets.`,
      `We’ll help match bearings to your wheels and use.`,
    ],
    `Buy skate bearings at ${SITE_BRAND_NAME}.`,
  ),
  wheels: copy(
    `The right wheelset changes how your bike rides. Carbon wheelsets from Scope and more — for road, gravel and performance cycling.`,
    [
      `Wheels shape acceleration, stability and comfort. We stock carbon wheelsets for road and gravel, including Scope.`,
      `Unsure about depth, hub spacing or tubeless? We’ll help match a set to your bike and routes.`,
      `Also check Scope Outlet for sharp deals with warranty.`,
    ],
    `Buy wheels & wheelsets at ${SITE_BRAND_NAME}. ${ADVICE_EN}`,
  ),
  "scope-outlet": copy(
    `Scope carbon wheelsets with outlet pricing, full warranty included. ${ADVICE_EN}`,
    [
      `Scope outlet: sharper prices on selected carbon wheelsets, warranty included.`,
      `Check sizes online or ask us which set fits your road or gravel bike.`,
    ],
    `Scope wheels outlet at ${SITE_BRAND_NAME}.`,
  ),
  "cycling-shoes": copy(
    `Cycling shoes from Nimbl and other top brands — light, stiff, and available to fit in Dedemsvaart.`,
    [
      `A great cycling shoe is stiff, light and fits precisely. Nimbl and other brands in our range focus on performance.`,
      `Come for a fitting in Dedemsvaart — width, volume and cleat position matter.`,
      `Order online if you know your size, or book advice first.`,
    ],
    `Buy cycling shoes at ${SITE_BRAND_NAME}: Nimbl & more.`,
  ),
  "lafuga-wear": copy(
    `LaFuga apparel — designed by Ingmar Berga. Ready-to-wear in the shop, custom kits for your team.`,
    [
      `LaFuga brings cycling apparel where design, performance and quality meet — designed by Ingmar Berga.`,
      `Shop the ready-to-wear collection here. For clubs and teams we build custom kits.`,
      `Browse items here or visit the LaFuga custom page for a team enquiry.`,
    ],
    `LaFuga cycling apparel at ${SITE_BRAND_NAME}. Custom kits and shop collection.`,
  ),
  accessories: copy(
    `Helmets, glasses, cleats, groupsets and other cycling accessories. ${ADVICE_EN}`,
    [
      `Accessories finish your setup: helmets, glasses, cleats and groupsets — chosen for quality and comfort.`,
      `We’ll help with sizing, compatibility and what you actually need.`,
    ],
    `Buy cycling accessories at ${SITE_BRAND_NAME}.`,
  ),
  glasses: copy(
    `Sports and cycling glasses with clear lenses and a solid fit. ${ADVICE_EN}`,
    [
      `Good cycling glasses protect against wind, dust and UV — with lenses for your light conditions.`,
      `Advice on fit and lenses in Dedemsvaart or via shop filters.`,
    ],
    `Sports & cycling glasses at ${SITE_BRAND_NAME}.`,
  ),
  "cycling-helmets": copy(
    `Cycling helmets including KASK — with the right size and ventilation. ${ADVICE_EN}`,
    [
      `Safety and comfort start with the right helmet. We’ll help with size, fit and ventilation.`,
      `KASK and other brands in our range focus on race and performance.`,
    ],
    `Buy cycling helmets at ${SITE_BRAND_NAME}.`,
  ),
  cleats: copy(
    `Cleats for Shimano, Look and Wahoo — including advice on positioning.`,
    [
      `The right cleats and position protect your knees and improve power transfer.`,
      `We’ll advise which system matches your shoes and pedals.`,
    ],
    `Buy cleats at ${SITE_BRAND_NAME}.`,
  ),
  "group-sets": copy(
    `Complete groupsets and parts for your road or gravel bike.`,
    [
      `From complete groupsets to spare parts: we help with compatibility and upgrade paths.`,
      `Choosing 2× vs 1×, or electronic vs mechanical? Ask us.`,
    ],
    `Buy groupsets at ${SITE_BRAND_NAME}.`,
  ),
  "schoenen-kleding": copy(
    `Nimbl cycling shoes and LaFuga apparel — fit and choose in Dedemsvaart.`,
    [
      `At ${SITE_BRAND_SHORT} you’ll find cycling shoes and kit under one roof: Nimbl (and more) for fit, LaFuga for jerseys, bibs and custom kits.`,
      `Browse the Fietsschoenen or Kleding subcategories, or see everything here. Need a fit? Visit Dedemsvaart.`,
      `Custom LaFuga team kits via /lafuga — shop collection online.`,
    ],
    `Cycling shoes & apparel at ${SITE_BRAND_NAME}.`,
  ),
};

function copyMap(locale: string): Record<string, CategoryCopy> {
  return locale === "en" ? COPY_EN : COPY_NL;
}

export function categoryCopyForSlug(
  slug: string | null | undefined,
  locale: string = "nl",
): CategoryCopy | undefined {
  if (!slug) return undefined;
  const raw = slug.trim().toLowerCase();
  if (!raw) return undefined;
  const map = copyMap(locale);
  return map[raw] ?? map[toCanonicalWcSlug(raw)];
}

/** Turn body paragraphs into simple HTML for `seo_footer_html`. */
export function categoryBodyToFooterHtml(body: string[] | undefined): string | null {
  if (!body?.length) return null;
  return body.map((p) => `<p>${escapeXml(p)}</p>`).join("\n");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
