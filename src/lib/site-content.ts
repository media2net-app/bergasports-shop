/**
 * NL-copy en navigatie — Bergasports 2.0 IA
 */

export const SITE_ADDRESS = "Julianastraat 3A, 7701 GH Dedemsvaart, Nederland";
export const SITE_KVK = "52087018";
export const INSTAGRAM_URL = "https://www.instagram.com/bergasports/";
export const INSTAGRAM_HANDLE = "@bergasports";

export const TRUST_BAR_USPS = [
  "Persoonlijk advies en expertise",
  "Professionele kwaliteit voor iedereen",
  "Exclusieve, hoogwaardige producten",
] as const;

export type ShopMenuLink = { href: string; label: string };

/** Publieke NL category-paden (alias → WC via category-slugs). */
export const BERGASPORTS_CATEGORY_PATHS = {
  bikes: "/fietsen",
  roadBikes: "/racefietsen",
  gravel: "/gravel",
  mtb: "/mtb",
  speedSkates: "/skeelers",
  wheels: "/wielen",
  scopeOutlet: "/scope-outlet",
  cyclingShoes: "/wielrenschoenen",
  lafugaWear: "/lafuga",
  glasses: "/brillen",
  accessories: "/accessoires",
  cyclingHelmets: "/helmen",
  usedBikes: "/tweedehands",
  cleats: "/schoenplaatjes",
  groupSets: "/groepsets",
} as const;

/** Flat links for search / mobile quick list. */
export const WEBSHOP_MENU_LINKS: ShopMenuLink[] = [
  { href: BERGASPORTS_CATEGORY_PATHS.roadBikes, label: "Racefietsen" },
  { href: BERGASPORTS_CATEGORY_PATHS.gravel, label: "Gravel" },
  { href: BERGASPORTS_CATEGORY_PATHS.mtb, label: "MTB" },
  { href: BERGASPORTS_CATEGORY_PATHS.wheels, label: "Fietswielen" },
  { href: BERGASPORTS_CATEGORY_PATHS.cyclingShoes, label: "Wielrenschoenen" },
  { href: BERGASPORTS_CATEGORY_PATHS.lafugaWear, label: "LaFuga" },
  { href: BERGASPORTS_CATEGORY_PATHS.glasses, label: "Brillen" },
  { href: BERGASPORTS_CATEGORY_PATHS.accessories, label: "Accessoires" },
];

export type ShopMegaMenuColumn = {
  title: string;
  links: ShopMenuLink[];
};

export const WEBSHOP_MEGA_MENU = {
  columns: [
    {
      title: "Fietsen",
      links: [
        { href: BERGASPORTS_CATEGORY_PATHS.roadBikes, label: "Racefietsen" },
        { href: BERGASPORTS_CATEGORY_PATHS.gravel, label: "Gravel" },
        { href: BERGASPORTS_CATEGORY_PATHS.mtb, label: "MTB" },
        { href: BERGASPORTS_CATEGORY_PATHS.speedSkates, label: "Skeelers" },
        { href: BERGASPORTS_CATEGORY_PATHS.usedBikes, label: "Tweedehands" },
      ],
    },
    {
      title: "Wielen",
      links: [
        { href: BERGASPORTS_CATEGORY_PATHS.wheels, label: "Fietswielen" },
        { href: BERGASPORTS_CATEGORY_PATHS.scopeOutlet, label: "Scope Outlet" },
      ],
    },
    {
      title: "Schoenen & kleding",
      links: [
        { href: BERGASPORTS_CATEGORY_PATHS.cyclingShoes, label: "Wielrenschoenen" },
        { href: BERGASPORTS_CATEGORY_PATHS.lafugaWear, label: "LaFuga" },
      ],
    },
    {
      title: "Accessoires",
      links: [
        { href: BERGASPORTS_CATEGORY_PATHS.glasses, label: "Brillen" },
        { href: BERGASPORTS_CATEGORY_PATHS.cyclingHelmets, label: "Helmen" },
        { href: BERGASPORTS_CATEGORY_PATHS.cleats, label: "Schoenplaatjes" },
        { href: BERGASPORTS_CATEGORY_PATHS.groupSets, label: "Groepsets" },
        { href: BERGASPORTS_CATEGORY_PATHS.accessories, label: "Overige accessoires" },
      ],
    },
  ] satisfies ShopMegaMenuColumn[],
  promo: {
    title: "Persoonlijk advies in Dedemsvaart",
    text: "Van racefiets tot wielrenschoenen — onze specialisten helpen je de juiste setup te kiezen.",
    cta: "Plan een afspraak",
    ctaHref: "/contact",
    shopCta: "Bekijk alle producten",
    shopHref: "/shop",
  },
} as const;

/** Alle categorie-URL's uit het webshop-menu (mega + mobiel). */
export function shopCategoryHrefsFromNav(): string[] {
  const hrefs = new Set<string>();
  for (const { href } of WEBSHOP_MENU_LINKS) {
    hrefs.add(href);
  }
  for (const col of WEBSHOP_MEGA_MENU.columns) {
    for (const { href } of col.links) {
      hrefs.add(href);
    }
  }
  return [...hrefs];
}

export function isShopNavigationPath(pathname: string): boolean {
  if (pathname === "/shop" || pathname.startsWith("/shop?")) {
    return true;
  }
  return shopCategoryHrefsFromNav().some(
    (href) => pathname === href || pathname.startsWith(`${href}?`),
  );
}

export type HeaderNavItem =
  | { type: "link"; href: string; label: string; badge?: string }
  | { type: "dropdown"; label: string; items: ShopMenuLink[]; columns?: ShopMegaMenuColumn[] }
  | { type: "mega"; label: string };

/** Desktop: top-level shop groups + nieuws. */
export const HEADER_NAV_LEFT: HeaderNavItem[] = [
  { type: "mega", label: "Webshop" },
  { type: "link", href: "/nieuws", label: "Nieuws" },
  { type: "link", href: BERGASPORTS_CATEGORY_PATHS.lafugaWear, label: "LaFuga", badge: "NEW" },
];

/** Rechts van het logo. */
export const HEADER_NAV_RIGHT: HeaderNavItem[] = [
  {
    type: "dropdown",
    label: "Bergasports",
    items: [
      { href: "/over-ons", label: "Over ons" },
      { href: "/onderhoud", label: "Onderhoud & reparatie" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

/** Mobiel: geneste boom. */
export const MOBILE_NAV_TREE: {
  label: string;
  href?: string;
  children?: ShopMenuLink[];
}[] = [
  { label: "Fietsen", children: WEBSHOP_MEGA_MENU.columns[0].links },
  { label: "Wielen", children: WEBSHOP_MEGA_MENU.columns[1].links },
  { label: "Schoenen & kleding", children: WEBSHOP_MEGA_MENU.columns[2].links },
  { label: "Accessoires", children: WEBSHOP_MEGA_MENU.columns[3].links },
  { label: "Nieuws", href: "/nieuws" },
  { label: "LaFuga", href: BERGASPORTS_CATEGORY_PATHS.lafugaWear },
  { label: "Over Bergasports", href: "/over-ons" },
  { label: "Onderhoud & reparatie", href: "/onderhoud" },
  { label: "Contact", href: "/contact" },
];

/** Volledige lijst (legacy flat). */
export const HEADER_NAV_ITEMS: HeaderNavItem[] = [...HEADER_NAV_LEFT, ...HEADER_NAV_RIGHT];

export const HOME_HERO = {
  titleLine1: "Meer dan een winkel.",
  titleLine2: "Je sportpartner.",
  lead: "Persoonlijk advies, hoogwaardige materialen en jarenlange ervaring in topsport.",
  primaryCta: "Bekijk fietsen",
  primaryHref: BERGASPORTS_CATEGORY_PATHS.roadBikes,
  secondaryCta: "Plan een afspraak",
  secondaryHref: "/contact",
} as const;

export const HOME_PILLARS = [
  {
    title: "Racefietsen",
    text: "Voor maximale snelheid en prestaties.",
    href: BERGASPORTS_CATEGORY_PATHS.roadBikes,
  },
  {
    title: "Wielen",
    text: "De juiste wielset voor jouw fiets en rijstijl.",
    href: BERGASPORTS_CATEGORY_PATHS.wheels,
  },
  {
    title: "Schoenen & kleding",
    text: "Performance materiaal voor training en wedstrijd.",
    href: BERGASPORTS_CATEGORY_PATHS.cyclingShoes,
  },
  {
    title: "Accessoires",
    text: "De details die het verschil maken.",
    href: BERGASPORTS_CATEGORY_PATHS.accessories,
  },
] as const;

export const HOME_BRANDS =
  "Colnago · Orbea · Basso · Cervélo · Cipollini · Titici · Sensa · Scope · Nimbl · LaFuga" as const;

export const HOME_ADVICE = {
  title: "De juiste keuze begint met goed advies.",
  text: "Niet iedere fietser heeft dezelfde doelen. Daarom kijken we naar jouw rijstijl, niveau, wensen en materiaal.",
  cta: "Plan een afspraak",
  ctaHref: "/contact",
} as const;

export const HOME_ABOUT = {
  title: "Van topsport naar Bergasports",
  text: "Van 2004 tot 2022 actief als professioneel schaatser en skeeleraar. Die ervaring met materiaal, prestaties en sport vormt de basis van Bergasports.",
  cta: "Lees mijn verhaal",
  ctaHref: "/over-ons",
} as const;

export const HOME_INSTAGRAM = {
  title: "Volg Bergasports",
  text: "Blijf op de hoogte van nieuwe producten, fietsen, LaFuga, evenementen en het laatste Bergasports-nieuws.",
  cta: "Volg ons op Instagram",
} as const;

export const HOME_VISIT = {
  title: "Bezoek Bergasports in Dedemsvaart",
  text: `${SITE_ADDRESS}`,
  cta: "Contact & route",
  ctaHref: "/contact",
} as const;

/** @deprecated kept for older imports */
export const HOME_INTRO = {
  title: HOME_HERO.titleLine1 + " " + HOME_HERO.titleLine2,
  lead: HOME_HERO.lead,
  cta: HOME_HERO.primaryCta,
} as const;

export const HOME_VALUE_PROPS = HOME_PILLARS.map((p) => ({ title: p.title, text: p.text }));

export const HOME_APPOINTMENT = {
  title: HOME_ADVICE.title,
  text: HOME_ADVICE.text,
  phoneCta: "Bel ons als je vragen hebt!",
} as const;

export const SITE_META_DESCRIPTION =
  "Fietsenwinkel in Dedemsvaart — Orbea, Colnago, Basso, Cervélo, Nimbl en meer. Racefietsen, wielen, schoenen en persoonlijk advies.";
