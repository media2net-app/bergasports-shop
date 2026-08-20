/**
 * Officiële LaFuga-copy (NL). Niet herschrijven of aanvullen.
 * CTA “via Bergasports.nl” wijst op deze shop naar /contact en /afspraak.
 */

import { SITE_BRAND_NAME } from "@/lib/site-brand";

const p = (blocks: string[]) => blocks.map((html) => `<p>${html}</p>`).join("\n");

const ctaRow = (items: { href: string; label: string; primary?: boolean }[]) =>
  `<p class="cms-cta-row">${items
    .map(
      (item) =>
        `<a class="cms-cta${item.primary ? " cms-cta-primary" : ""}" href="${item.href}">${item.label}</a>`,
    )
    .join("")}</p>`;

export const LAFUGA_HEADING = "LaFuga – Fietsen en skeeleren in stijl";

export const LAFUGA_META_DESCRIPTION =
  "LaFuga – Fietsen en skeeleren in stijl. Designed by Ingmar Berga. Gemaakt voor mensen die nét dat beetje meer willen.";

/** Korte intro boven de productlijst op /lafuga. */
export const LAFUGA_SEO_INTRO = LAFUGA_META_DESCRIPTION;

const DESIGNED_BY = "Designed by Ingmar Berga. Gemaakt voor mensen die nét dat beetje meer willen.";

const PARAGRAPHS = [
  "Met LaFuga brengt Bergasports fietskleding en skeelerkleding samen waarin design, prestaties en kwaliteit centraal staan. Vanuit passie voor sport ontwikkelen we kleding die niet alleen goed zit en presteert, maar er ook onderscheidend uitziet.",
  "Naast onze standaard collectie is LaFuga gespecialiseerd in het ontwerpen en produceren van kleding voor clubs, bedrijven en teams. Helemaal afgestemd op jouw wensen. Van kleuren en uitstraling tot pasvorm, details en design: samen creëren we een tenue dat echt bij jullie past.",
  "We kiezen bewust voor goede materialen, het beste zeem en snelle stoffen. Want wanneer je prestaties telt, wil je kleding waarop je kunt vertrouwen. Of je nu op de fiets stapt voor een wedstrijd, training of lange tocht, LaFuga is gemaakt om te presteren.",
  "Steeds meer bedrijven, teams en topsporters hebben inmiddels voor LaFuga gekozen. Onder andere Connected to Care, M2 Bouw, Nuvelstijn Mode en Okay Fashion &amp; Jeans gingen je voor. Ook topsporters, waaronder Asia Berga, vertrouwen op de kwaliteit en uitstraling van LaFuga.",
  "En die kwaliteit heeft zich bewezen: in onze kleding zijn al meerdere nationale titels behaald.",
  "Van de eerste schets tot het moment waarop je jouw team in een uniek tenue ziet rijden: LaFuga is kleding met passie, karakter en een sterk verhaal.",
] as const;

const TAGLINE = "Jouw team. Jouw stijl. Jouw LaFuga.";
const ASK = "Benieuwd wat we voor jouw club, bedrijf of team kunnen betekenen?";
const CTA_LINE =
  'Vraag meer informatie aan via <a href="/contact">Bergasports.nl</a> en ontdek de mogelijkheden van LaFuga.';

function lafugaCtaRow(): string {
  return ctaRow([
    { href: "/contact", label: "Vraag meer informatie aan", primary: true },
    { href: "/afspraak#formulier", label: "Maak een afspraak" },
  ]);
}

function closingHtml(): string {
  return [p([`<strong>${TAGLINE}</strong>`]), p([ASK]), p([CTA_LINE]), lafugaCtaRow()].join("\n");
}

/** Volledige CMS-body voor /lafuga (heading staat los). */
export function lafugaBodyHtml(): string {
  return [p([DESIGNED_BY]), p([...PARAGRAPHS]), closingHtml()].join("\n");
}

/** Footer onder de productlijst: hun tekst minus de korte intro. */
export function lafugaSeoFooterHtml(): string {
  return [p([...PARAGRAPHS]), closingHtml()].join("\n");
}

/** Opening op /merken — hun eerste zinnen, daarna doorverwijzing naar /lafuga. */
export function lafugaMerkenSectionHtml(): string {
  return [
    `<h2>${LAFUGA_HEADING}</h2>`,
    p([DESIGNED_BY, PARAGRAPHS[0]]),
    ctaRow([{ href: "/lafuga", label: "LaFuga", primary: true }]),
  ].join("\n");
}

export function lafugaNlCategoryTranslation(): Record<string, string> {
  return {
    name: "LaFuga",
    slug: "lafuga-wear",
    description: LAFUGA_SEO_INTRO,
    seoTitle: `${LAFUGA_HEADING} | ${SITE_BRAND_NAME}`,
    seoDescription: LAFUGA_META_DESCRIPTION,
    seoFooterHtml: lafugaSeoFooterHtml(),
  };
}
