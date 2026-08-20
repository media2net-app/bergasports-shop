/**
 * LaFuga custom kleding — maatwerk & collectie (NL).
 */

import { SITE_BRAND_NAME } from "@/lib/site-brand";
import { BERGASPORTS_CATEGORY_PATHS } from "@/lib/site-content";

const p = (blocks: string[]) => blocks.map((html) => `<p>${html}</p>`).join("\n");

const ctaRow = (items: { href: string; label: string; primary?: boolean }[]) =>
  `<p class="cms-cta-row">${items
    .map(
      (item) =>
        `<a class="cms-cta${item.primary ? " cms-cta-primary" : ""}" href="${item.href}">${item.label}</a>`,
    )
    .join("")}</p>`;

export const LAFUGA_HEADING = "LaFuga custom kleding";

export const LAFUGA_META_DESCRIPTION =
  "LaFuga custom kleding van Bergasports: maatwerk voor clubs, bedrijven en teams, plus een selectie in de shop. Designed by Ingmar Berga.";

/** Korte intro boven de productlijst op /kleding (LaFuga shopcollectie). */
export const LAFUGA_SEO_INTRO =
  "LaFuga custom kleding — designed by Ingmar Berga. Standaard collectie in de shop, maatwerk voor jouw team.";

const DESIGNED_BY = "Designed by Ingmar Berga. Gemaakt voor mensen die nét dat beetje meer willen.";

const PARAGRAPHS = [
  "Met LaFuga brengt Bergasports fietskleding en skeelerkleding samen waarin design, prestaties en kwaliteit centraal staan. Vanuit passie voor sport ontwikkelen we kleding die niet alleen goed zit en presteert, maar er ook onderscheidend uitziet.",
  "LaFuga is gespecialiseerd in <strong>custom kleding op maat</strong>: ontwerp en productie voor clubs, bedrijven en teams. Helemaal afgestemd op jouw wensen — van kleuren en uitstraling tot pasvorm, details en design. Samen creëren we een tenue dat echt bij jullie past.",
  "We kiezen bewust voor goede materialen, het beste zeem en snelle stoffen. Want wanneer je prestaties telt, wil je kleding waarop je kunt vertrouwen. Of je nu op de fiets stapt voor een wedstrijd, training of lange tocht, LaFuga is gemaakt om te presteren.",
  "Steeds meer bedrijven, teams en topsporters hebben inmiddels voor LaFuga gekozen. Onder andere Connected to Care, M2 Bouw, Nuvelstijn Mode en Okay Fashion &amp; Jeans gingen je voor. Ook topsporters, waaronder Asia Berga, vertrouwen op de kwaliteit en uitstraling van LaFuga.",
  "En die kwaliteit heeft zich bewezen: in onze kleding zijn al meerdere nationale titels behaald.",
  "Van de eerste schets tot het moment waarop je jouw team in een uniek tenue ziet rijden: LaFuga is kleding met passie, karakter en een sterk verhaal.",
] as const;

const TAGLINE = "Jouw team. Jouw stijl. Jouw LaFuga.";
const ASK = "Benieuwd wat we voor jouw club, bedrijf of team kunnen betekenen?";
const CTA_LINE =
  "Vraag een maatwerk-aanvraag aan via het formulier, of bekijk eerst de collectie in de shop.";

function lafugaCtaRow(): string {
  return ctaRow([
    { href: "#maatwerk-aanvraag", label: "Maatwerk aanvragen", primary: true },
    { href: BERGASPORTS_CATEGORY_PATHS.lafugaWear, label: "Bekijk LaFuga in de shop" },
  ]);
}

function closingHtml(): string {
  return [p([`<strong>${TAGLINE}</strong>`]), p([ASK]), p([CTA_LINE]), lafugaCtaRow()].join("\n");
}

/** Volledige CMS-body voor /lafuga (heading staat los). */
export function lafugaBodyHtml(): string {
  return [
    p([DESIGNED_BY]),
    p([
      "Op deze pagina vind je alles over <strong>LaFuga custom kleding</strong>: maatwerk voor teams en clubs, en een doorverwijzing naar de producten in onze webshop.",
    ]),
    p([...PARAGRAPHS]),
    closingHtml(),
  ].join("\n");
}

/** Footer onder de productlijst: focus op collectie + link naar maatwerk. */
export function lafugaSeoFooterHtml(): string {
  return [
    p([...PARAGRAPHS]),
    p([`<strong>${TAGLINE}</strong>`]),
    p([ASK]),
    ctaRow([
      { href: "/lafuga#maatwerk-aanvraag", label: "Maatwerk aanvragen", primary: true },
      { href: "/lafuga", label: "Meer over LaFuga custom" },
    ]),
  ].join("\n");
}

/** Opening op /merken — hun eerste zinnen, daarna doorverwijzing naar /lafuga. */
export function lafugaMerkenSectionHtml(): string {
  return [
    `<h2>${LAFUGA_HEADING}</h2>`,
    p([DESIGNED_BY, PARAGRAPHS[0], PARAGRAPHS[1]]),
    ctaRow([
      { href: "/lafuga", label: "LaFuga custom kleding", primary: true },
      { href: BERGASPORTS_CATEGORY_PATHS.lafugaWear, label: "Shopcollectie" },
    ]),
  ].join("\n");
}

export function lafugaNlCategoryTranslation(): Record<string, string> {
  return {
    name: "LaFuga kleding",
    slug: "lafuga-wear",
    description: LAFUGA_SEO_INTRO,
    seoTitle: `LaFuga kleding | ${SITE_BRAND_NAME}`,
    seoDescription: LAFUGA_META_DESCRIPTION,
    seoFooterHtml: lafugaSeoFooterHtml(),
  };
}
