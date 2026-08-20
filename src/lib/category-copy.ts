/**
 * Locale-aware category intro/meta copy for storefront SEO blocks.
 * Admin DB overrides (translations[locale]) take precedence when present.
 */

import { toCanonicalWcSlug } from "@/lib/category-slugs";
import { LAFUGA_META_DESCRIPTION, LAFUGA_SEO_INTRO } from "@/lib/lafuga-copy";
import { SITE_BRAND_NAME, SITE_BRAND_SHORT } from "@/lib/site-brand";

export type CategoryCopy = {
  intro: string;
  seoDescription: string;
};

const ADVICE_NL = `Persoonlijk advies vanuit Dedemsvaart.`;
const ADVICE_EN = `Personal advice from Dedemsvaart.`;

const COPY_NL: Record<string, CategoryCopy> = {
  bikes: {
    intro: `Racefietsen, gravelbikes en mountainbikes van merken die we zelf rijden — Orbea, Colnago, Basso, Cervélo en meer. ${ADVICE_NL}`,
    seoDescription: `Fietsen kopen bij ${SITE_BRAND_NAME}: race, gravel en MTB. ${ADVICE_NL}`,
  },
  "road-bike": {
    intro: `High-end racefietsen voor renners die meer uit hun materiaal willen halen. Bij ${SITE_BRAND_SHORT} vind je Colnago, Cipollini, Orbea, Basso, Cervélo en meer — met advies over maat, groepset en wielen.`,
    seoDescription: `Racefietsen kopen bij ${SITE_BRAND_NAME}. Professioneel advies en persoonlijke service vanuit Dedemsvaart.`,
  },
  gravelbike: {
    intro: `Van snelle gravelraces tot lange avonturen: kies een gravelbike die past bij jouw terrein en rijstijl. ${ADVICE_NL}`,
    seoDescription: `Gravelbikes kopen bij ${SITE_BRAND_NAME}. ${ADVICE_NL}`,
  },
  "gravel-bike": {
    intro: `Van snelle gravelraces tot lange avonturen: kies een gravelbike die past bij jouw terrein en rijstijl. ${ADVICE_NL}`,
    seoDescription: `Gravelbikes kopen bij ${SITE_BRAND_NAME}. ${ADVICE_NL}`,
  },
  mtb: {
    intro: `Performance mountainbikes voor cross-country, trails en technische parcoursen. ${ADVICE_NL}`,
    seoDescription: `Mountainbikes (MTB) kopen bij ${SITE_BRAND_NAME}. ${ADVICE_NL}`,
  },
  "speed-skates": {
    intro: `Skeelers, schoenen, frames, wielen en lagers voor training en wedstrijd. Advies van oud-topsporter Ingmar Berga uit Dedemsvaart.`,
    seoDescription: `Skeelers en skeelermateriaal bij ${SITE_BRAND_NAME}. ${ADVICE_NL}`,
  },
  "skate-bearings": {
    intro: `Keramische en stalen lagers voor skeelerwielen — minder rolweerstand, meer snelheid. ${ADVICE_NL}`,
    seoDescription: `Skeelerlagers kopen bij ${SITE_BRAND_NAME}.`,
  },
  "skate-shoes": {
    intro: `Skeelerschoenen en raceboots voor inline speed skating. Passen en advies in Dedemsvaart.`,
    seoDescription: `Skeelerschoenen kopen bij ${SITE_BRAND_NAME}.`,
  },
  "skate-wheels": {
    intro: `Skeelerwielen in verschillende diameters en compounds voor training en wedstrijd.`,
    seoDescription: `Skeelerwielen kopen bij ${SITE_BRAND_NAME}.`,
  },
  "complete-skates": {
    intro: `Complete skeelersets — klaar om te rijden, met frame, schoenen en wielen op elkaar afgestemd.`,
    seoDescription: `Complete skeelers kopen bij ${SITE_BRAND_NAME}.`,
  },
  "used-bikes": {
    intro: `Gecontroleerde tweedehands racefietsen, nagekeken in onze eigen werkplaats. ${ADVICE_NL}`,
    seoDescription: `Tweedehands racefietsen bij ${SITE_BRAND_NAME}.`,
  },
  wheels: {
    intro: `De juiste wielset verandert het karakter van je fiets. Carbon wielsets van Scope en meer — voor race, gravel en performance.`,
    seoDescription: `Wielen & wielsets kopen bij ${SITE_BRAND_NAME}. ${ADVICE_NL}`,
  },
  "scope-outlet": {
    intro: `Scope carbon wielsets met outletvoordeel, met volledige garantie. ${ADVICE_NL}`,
    seoDescription: `Scope wielen outlet bij ${SITE_BRAND_NAME}.`,
  },
  "cycling-shoes": {
    intro: `Fietsschoenen van Nimbl en andere topmerken — licht, stijf en te passen in Dedemsvaart.`,
    seoDescription: `Fietsschoenen kopen bij ${SITE_BRAND_NAME}: Nimbl & meer.`,
  },
  "lafuga-wear": {
    intro: LAFUGA_SEO_INTRO,
    seoDescription: LAFUGA_META_DESCRIPTION,
  },
  glasses: {
    intro: `Sportbrillen en fietsbrillen met heldere lenzen en een goede pasvorm. ${ADVICE_NL}`,
    seoDescription: `Sportbrillen & fietsbrillen bij ${SITE_BRAND_NAME}.`,
  },
  accessories: {
    intro: `Helmen, brillen, schoenplaatjes, groepsets en alle andere fietsaccessoires. ${ADVICE_NL}`,
    seoDescription: `Fietsaccessoires kopen bij ${SITE_BRAND_NAME}.`,
  },
  "cycling-helmets": {
    intro: `Fietshelmen van onder andere KASK — met de juiste maat en ventilatie. ${ADVICE_NL}`,
    seoDescription: `Fietshelmen kopen bij ${SITE_BRAND_NAME}.`,
  },
  cleats: {
    intro: `Schoenplaatjes voor Shimano, Look en Wahoo — inclusief advies over de juiste stand.`,
    seoDescription: `Schoenplaatjes kopen bij ${SITE_BRAND_NAME}.`,
  },
  "group-sets": {
    intro: `Complete groepsets en onderdelen voor je racefiets of gravelbike.`,
    seoDescription: `Groepsets kopen bij ${SITE_BRAND_NAME}.`,
  },
  "schoenen-kleding": {
    intro: `Fietsschoenen en fietskleding — te passen en te kiezen in Dedemsvaart.`,
    seoDescription: `Fietsschoenen & kleding bij ${SITE_BRAND_NAME}.`,
  },
};

const COPY_EN: Record<string, CategoryCopy> = {
  bikes: {
    intro: `Road, gravel and mountain bikes from brands we ride ourselves — Orbea, Colnago, Basso, Cervélo and more. ${ADVICE_EN}`,
    seoDescription: `Buy bikes at ${SITE_BRAND_NAME}: road, gravel and MTB. ${ADVICE_EN}`,
  },
  "road-bike": {
    intro: `High-end road bikes for riders who want more from their gear. At ${SITE_BRAND_SHORT} you’ll find Colnago, Cipollini, Orbea, Basso, Cervélo and more — with advice on size, groupset and wheels.`,
    seoDescription: `Buy road bikes at ${SITE_BRAND_NAME}. Expert advice from Dedemsvaart.`,
  },
  gravelbike: {
    intro: `From fast gravel races to long adventures: choose a gravel bike that matches your terrain and riding style. ${ADVICE_EN}`,
    seoDescription: `Buy gravel bikes at ${SITE_BRAND_NAME}. ${ADVICE_EN}`,
  },
  "gravel-bike": {
    intro: `From fast gravel races to long adventures: choose a gravel bike that matches your terrain and riding style. ${ADVICE_EN}`,
    seoDescription: `Buy gravel bikes at ${SITE_BRAND_NAME}. ${ADVICE_EN}`,
  },
  mtb: {
    intro: `Performance mountain bikes for cross-country, trails and technical courses. ${ADVICE_EN}`,
    seoDescription: `Buy mountain bikes (MTB) at ${SITE_BRAND_NAME}. ${ADVICE_EN}`,
  },
  "speed-skates": {
    intro: `Speed skates, boots, frames, wheels and bearings for training and racing. Advice from former elite athlete Ingmar Berga in Dedemsvaart.`,
    seoDescription: `Speed skates and skating gear at ${SITE_BRAND_NAME}. ${ADVICE_EN}`,
  },
  "skate-bearings": {
    intro: `Ceramic and steel bearings for skate wheels — lower rolling resistance, higher speed. ${ADVICE_EN}`,
    seoDescription: `Buy skate bearings at ${SITE_BRAND_NAME}.`,
  },
  "skate-shoes": {
    intro: `Inline speed skating boots — fit and advice in Dedemsvaart.`,
    seoDescription: `Buy skate shoes at ${SITE_BRAND_NAME}.`,
  },
  "skate-wheels": {
    intro: `Inline skate wheels in different diameters and compounds for training and racing.`,
    seoDescription: `Buy skate wheels at ${SITE_BRAND_NAME}.`,
  },
  "complete-skates": {
    intro: `Complete speed skate packages — ready to ride, with frame, boots and wheels matched together.`,
    seoDescription: `Buy complete speed skates at ${SITE_BRAND_NAME}.`,
  },
  "used-bikes": {
    intro: `Checked used road bikes, inspected in our own workshop. ${ADVICE_EN}`,
    seoDescription: `Used road bikes at ${SITE_BRAND_NAME}.`,
  },
  wheels: {
    intro: `The right wheelset changes how your bike rides. Carbon wheelsets from Scope and more — for road, gravel and performance cycling.`,
    seoDescription: `Buy wheels & wheelsets at ${SITE_BRAND_NAME}. ${ADVICE_EN}`,
  },
  "scope-outlet": {
    intro: `Scope carbon wheelsets with outlet pricing, full warranty included. ${ADVICE_EN}`,
    seoDescription: `Scope wheels outlet at ${SITE_BRAND_NAME}.`,
  },
  "cycling-shoes": {
    intro: `Cycling shoes from Nimbl and other top brands — light, stiff, and available to fit in Dedemsvaart.`,
    seoDescription: `Buy cycling shoes at ${SITE_BRAND_NAME}: Nimbl & more.`,
  },
  "lafuga-wear": {
    intro: `LaFuga apparel — designed by Ingmar Berga. Ready-to-wear in the shop, custom kits for your team.`,
    seoDescription: `LaFuga cycling apparel at ${SITE_BRAND_NAME}. Custom kits and shop collection.`,
  },
  glasses: {
    intro: `Sports and cycling glasses with clear lenses and a solid fit. ${ADVICE_EN}`,
    seoDescription: `Sports & cycling glasses at ${SITE_BRAND_NAME}.`,
  },
  accessories: {
    intro: `Helmets, glasses, cleats, groupsets and other cycling accessories. ${ADVICE_EN}`,
    seoDescription: `Buy cycling accessories at ${SITE_BRAND_NAME}.`,
  },
  "cycling-helmets": {
    intro: `Cycling helmets including KASK — with the right size and ventilation. ${ADVICE_EN}`,
    seoDescription: `Buy cycling helmets at ${SITE_BRAND_NAME}.`,
  },
  cleats: {
    intro: `Cleats for Shimano, Look and Wahoo — including advice on positioning.`,
    seoDescription: `Buy cleats at ${SITE_BRAND_NAME}.`,
  },
  "group-sets": {
    intro: `Complete groupsets and parts for your road or gravel bike.`,
    seoDescription: `Buy groupsets at ${SITE_BRAND_NAME}.`,
  },
  "schoenen-kleding": {
    intro: `Cycling shoes and apparel — to fit and choose in Dedemsvaart.`,
    seoDescription: `Cycling shoes & apparel at ${SITE_BRAND_NAME}.`,
  },
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
