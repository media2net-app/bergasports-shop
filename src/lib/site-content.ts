/**
 * NL-copy en navigatie — Bergasports 2.0 IA
 */

export const SITE_ADDRESS = "Julianastraat 3A, 7701 GH Dedemsvaart, Nederland";
export const SITE_KVK = "52087018";

export type OpeningHoursRow = {
  day: string;
  /** Engelse dagnaam voor schema.org openingHoursSpecification. */
  schemaDay: string;
  hours: string;
  opens?: string;
  closes?: string;
};

/** Winkeltijden Julianastraat 3A — gelijk aan bergasports.com/nl/contact. */
export const SHOP_OPENING_HOURS: OpeningHoursRow[] = [
  { day: "Maandag", schemaDay: "Monday", hours: "Gesloten" },
  { day: "Dinsdag", schemaDay: "Tuesday", hours: "12:30 – 17:30", opens: "12:30", closes: "17:30" },
  { day: "Woensdag", schemaDay: "Wednesday", hours: "12:30 – 17:30", opens: "12:30", closes: "17:30" },
  { day: "Donderdag", schemaDay: "Thursday", hours: "12:30 – 17:00", opens: "12:30", closes: "17:00" },
  {
    day: "Vrijdag",
    schemaDay: "Friday",
    hours: "12:30 – 17:30 · 19:00 – 21:00",
    opens: "12:30",
    closes: "17:30",
  },
  { day: "Zaterdag", schemaDay: "Saturday", hours: "12:00 – 16:00", opens: "12:00", closes: "16:00" },
  { day: "Zondag", schemaDay: "Sunday", hours: "Gesloten" },
];

/** Eénregelige samenvatting voor footer, trust-blokken en e-mails. */
export const SHOP_OPENING_HOURS_SHORT =
  "Di–wo 12:30 – 17:30 · do 12:30 – 17:00 · vr 12:30 – 17:30 · 19:00 – 21:00 · za 12:00 – 16:00";

export const SHOP_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Julianastraat+3A+7701+GH+Dedemsvaart";

/** Embedbare kaart (geen API-key). */
export const SHOP_MAPS_EMBED_URL =
  "https://maps.google.com/maps?q=Julianastraat%203A%2C%207701%20GH%20Dedemsvaart&hl=nl&z=16&output=embed";

/** WGS84 van Julianastraat 3A, Dedemsvaart — voor LocalBusiness JSON-LD. */
export const SHOP_GEO = { latitude: 52.5998, longitude: 6.4584 } as const;

/** Nederlandse URL's voor de juridische pagina's — één bron voor links, seed en sitemap. */
export const LEGAL_PAGE_PATHS = {
  terms: "/algemene-voorwaarden",
  privacy: "/privacybeleid",
  cookies: "/cookiebeleid",
  payment: "/betaalmethoden",
  shipping: "/verzending",
  returns: "/retouren",
} as const;
export const INSTAGRAM_URL = "https://www.instagram.com/bergasportsnl/";
export const INSTAGRAM_HANDLE = "@bergasportsnl";

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
  skateBearings: "/skeeler-lagers",
  skateShoes: "/skeeler-schoenen",
  skateWheels: "/skeeler-wielen",
  completeSkates: "/complete-skeelers",
  wheels: "/wielen",
  scopeOutlet: "/scope-outlet",
  cyclingShoes: "/wielrenschoenen",
  shoesClothing: "/schoenen-kleding",
  lafugaWear: "/lafuga-kleding",
  lafugaCustom: "/lafuga",
  glasses: "/brillen",
  accessories: "/accessoires",
  cyclingHelmets: "/helmen",
  cleats: "/schoenplaatjes",
  groupSets: "/groepsets",
} as const;

/** Flat links for search / mobile quick list. */
export const WEBSHOP_MENU_LINKS: ShopMenuLink[] = [
  { href: BERGASPORTS_CATEGORY_PATHS.bikes, label: "Fietsen" },
  { href: BERGASPORTS_CATEGORY_PATHS.speedSkates, label: "Skeelers" },
  { href: BERGASPORTS_CATEGORY_PATHS.wheels, label: "Wielen" },
  { href: BERGASPORTS_CATEGORY_PATHS.cyclingShoes, label: "Fietsschoenen" },
  { href: BERGASPORTS_CATEGORY_PATHS.lafugaWear, label: "Kleding" },
  { href: BERGASPORTS_CATEGORY_PATHS.accessories, label: "Accessoires" },
];

export type ShopMegaMenuColumn = {
  title: string;
  /** Groep zonder subcategorieën linkt via de kop. */
  href?: string;
  links: ShopMenuLink[];
};

export const WEBSHOP_MEGA_MENU = {
  columns: [
    {
      title: "Fietsen",
      href: BERGASPORTS_CATEGORY_PATHS.bikes,
      links: [
        { href: BERGASPORTS_CATEGORY_PATHS.roadBikes, label: "Racefietsen" },
        { href: BERGASPORTS_CATEGORY_PATHS.gravel, label: "Gravel" },
        { href: BERGASPORTS_CATEGORY_PATHS.mtb, label: "MTB" },
      ],
    },
    {
      title: "Skeelers",
      href: BERGASPORTS_CATEGORY_PATHS.speedSkates,
      links: [
        { href: BERGASPORTS_CATEGORY_PATHS.completeSkates, label: "Complete skeelers" },
        { href: BERGASPORTS_CATEGORY_PATHS.skateShoes, label: "Schoenen" },
        { href: BERGASPORTS_CATEGORY_PATHS.skateWheels, label: "Wielen" },
        { href: BERGASPORTS_CATEGORY_PATHS.skateBearings, label: "Lagers" },
      ],
    },
    {
      title: "Wielen",
      href: BERGASPORTS_CATEGORY_PATHS.wheels,
      links: [
        { href: BERGASPORTS_CATEGORY_PATHS.wheels, label: "Wielen" },
        { href: BERGASPORTS_CATEGORY_PATHS.scopeOutlet, label: "Scope Outlet" },
      ],
    },
    {
      title: "Schoenen & kleding",
      href: BERGASPORTS_CATEGORY_PATHS.shoesClothing,
      links: [
        { href: BERGASPORTS_CATEGORY_PATHS.cyclingShoes, label: "Fietsschoenen" },
        { href: BERGASPORTS_CATEGORY_PATHS.lafugaWear, label: "Kleding" },
      ],
    },
    {
      title: "Accessoires",
      href: BERGASPORTS_CATEGORY_PATHS.accessories,
      links: [
        { href: BERGASPORTS_CATEGORY_PATHS.cyclingHelmets, label: "Helmen" },
        { href: BERGASPORTS_CATEGORY_PATHS.glasses, label: "Brillen" },
        { href: BERGASPORTS_CATEGORY_PATHS.groupSets, label: "Groepsets" },
        { href: BERGASPORTS_CATEGORY_PATHS.cleats, label: "Schoenplaatjes" },
      ],
    },
  ] satisfies ShopMegaMenuColumn[],
  promo: {
    title: "Persoonlijk advies in Dedemsvaart",
    text: "Van racefiets tot wielrenschoenen — met persoonlijk advies helpen we je de juiste keuze te maken.",
    cta: "Plan een afspraak",
    ctaHref: "/afspraak#formulier",
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
    if (col.href) {
      hrefs.add(col.href);
    }
    for (const { href } of col.links) {
      hrefs.add(href);
    }
  }
  return [...hrefs];
}

export function isShopNavigationPath(pathname: string): boolean {
  if (pathname === "/shop" || pathname.startsWith("/shop?") || pathname.startsWith("/product/")) {
    return true;
  }
  // /lafuga is de maatwerk-landingspagina, geen productcategorie.
  if (pathname === "/lafuga" || pathname.startsWith("/lafuga?")) {
    return false;
  }
  return shopCategoryHrefsFromNav().some(
    (href) => pathname === href || pathname.startsWith(`${href}?`) || pathname.startsWith(`${href}/`),
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
  { type: "link", href: BERGASPORTS_CATEGORY_PATHS.lafugaCustom, label: "LaFuga custom kleding" },
];

/** Rechts van het logo. */
export const ABOUT_MENU_LINKS: ShopMenuLink[] = [
  { href: "/over-ons", label: "Mijn verhaal" },
  { href: "/onderhoud", label: "Onderhoud & reparatie" },
  { href: "/merken", label: "Merken" },
  { href: "/contact", label: "Contact & route" },
];

export const HEADER_NAV_RIGHT: HeaderNavItem[] = [
  {
    type: "dropdown",
    label: "Over ons",
    items: ABOUT_MENU_LINKS,
  },
];

/** Mobiel: geneste boom — shopgroepen volgen het mega-menu. */
export const MOBILE_NAV_TREE: {
  label: string;
  href?: string;
  badge?: string;
  children?: ShopMenuLink[];
}[] = [
  { label: "Alle producten", href: "/shop" },
  ...WEBSHOP_MEGA_MENU.columns.map((column) =>
    column.links.length > 0
      ? {
          label: column.title,
          children: [
            ...(column.href ? [{ href: column.href, label: `Alles in ${column.title.toLowerCase()}` }] : []),
            ...column.links,
          ],
        }
      : { label: column.title, href: column.href },
  ),
  { label: "Nieuws", href: "/nieuws" },
  { label: "LaFuga custom kleding", href: BERGASPORTS_CATEGORY_PATHS.lafugaCustom },
  { label: "Over ons", children: ABOUT_MENU_LINKS },
];

/** Volledige lijst (legacy flat). */
export const HEADER_NAV_ITEMS: HeaderNavItem[] = [...HEADER_NAV_LEFT, ...HEADER_NAV_RIGHT];

export const HOME_HERO = {
  titleLine1: "Meer dan een winkel.",
  titleLine2: "Je sportpartner.",
  lead: "Persoonlijk advies, hoogwaardige materialen en jarenlange ervaring in topsport.",
  primaryCta: "Bekijk fietsen",
  primaryHref: BERGASPORTS_CATEGORY_PATHS.bikes,
  secondaryCta: "Plan een afspraak",
  secondaryHref: "/afspraak#formulier",
} as const;

export const HOME_PILLARS = [
  {
    title: "Fietsen",
    text: "Race, gravel en mountainbike — merken die we zelf rijden.",
    href: BERGASPORTS_CATEGORY_PATHS.bikes,
  },
  {
    title: "Wielen",
    text: "De juiste wielset voor jouw fiets en rijstijl.",
    href: BERGASPORTS_CATEGORY_PATHS.wheels,
  },
  {
    title: "Schoenen & kleding",
    text: "Hoogwaardig materiaal voor training en wedstrijden.",
    href: BERGASPORTS_CATEGORY_PATHS.shoesClothing,
  },
  {
    title: "Accessoires",
    text: "De details die het verschil maken.",
    href: BERGASPORTS_CATEGORY_PATHS.accessories,
  },
] as const;

export const HOME_BRANDS =
  "Colnago · Orbea · Basso · Cervélo · Cipollini · Titici · Sensa · Scope · Nimbl · LaFuga · Double FF · KASK" as const;

export const HOME_BRAND_LIST = [
  "Colnago",
  "Orbea",
  "Basso",
  "Cervélo",
  "Cipollini",
  "Titici",
  "Sensa",
  "Scope",
  "Nimbl",
  "LaFuga",
  "Double FF",
  "KASK",
] as const;

export const HOME_ADVICE = {
  title: "De juiste keuze begint met goed advies.",
  text: "Niet iedere fietser heeft dezelfde doelen. We kijken naar jouw rijstijl, niveau, pasvorm en materiaal — of je nu race, gravel of mountainbike rijdt. Plan een afspraak in Dedemsvaart, of bel en WhatsApp als het snel moet.",
  cta: "Plan een afspraak",
  ctaHref: "/afspraak#formulier",
} as const;

export const HOME_ABOUT = {
  title: "Van topsport naar Bergasports",
  text: "Twee keer Nederlands kampioen marathonschaatsen (2007 en 2013), Europees kampioen skeeleren op de marathon (2010) en Nederlands kampioen inline in 2019. Die jaren op het hoogste niveau — plus een KNSB Marathon Cup-klassement — vormen de basis van Bergasports: materiaal dat klopt, advies zonder omwegen.",
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
  text: "Kom langs aan de Julianastraat voor persoonlijk advies, Nimbl of LaFuga passen, een vakkundige check van je racefiets of gewoon een goede kop koffie.",
  address: SITE_ADDRESS,
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

/**
 * SEO-copy voor de vaste pagina's. CMS-velden (meta_title / meta_description)
 * gaan hier vóór; dit is de fallback wanneer de admin niets heeft ingevuld.
 */
export const PAGE_SEO = {
  home: {
    title: "Bergasports | Racefietsen, Gravel, MTB, Nimbl & Skeelers",
    description:
      "Bergasports in Dedemsvaart is specialist in racefietsen, gravel, MTB, skeelers, Nimbl schoenen en fietskleding. Persoonlijk advies, onderhoud en reparatie.",
  },
  shop: {
    title: "Webshop | Racefietsen, wielen, schoenen & accessoires | Bergasports",
    description:
      "Het volledige assortiment van Bergasports: racefietsen, gravel, MTB, skeelers, wielen, Nimbl schoenen, LaFuga kleding en accessoires. Persoonlijk advies uit Dedemsvaart.",
  },
  contact: {
    title: "Contact & route | Bergasports Dedemsvaart",
    description:
      "Bezoek Bergasports aan de Julianastraat 3A in Dedemsvaart. Bekijk onze openingstijden, bel 06 - 8316 2631 of plan je route voor persoonlijk advies.",
  },
} as const;
