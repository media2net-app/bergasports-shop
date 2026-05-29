/**
 * NL-copy en navigatie — overgenomen van https://www.bergasports.com/nl/
 */

export const SITE_ADDRESS = "Julianastraat 3A, 7701 GH Dedemsvaart, Nederland";
export const SITE_KVK = "52087018";

export const TRUST_BAR_USPS = [
  "Persoonlijk advies en expertise",
  "Professionele kwaliteit voor iedereen",
  "Exclusieve, hoogwaardige producten",
] as const;

export type ShopMenuLink = { href: string; label: string };

/**
 * WooCommerce categorie-slugs (bergasports.com) → canonieke shop-paden `/{slug}`.
 * Zie `src/data/ralex-categories.json` na `npm run import:bergasports`.
 */
export const BERGASPORTS_CATEGORY_PATHS = {
  bikes: "/bikes",
  speedSkates: "/speed-skates",
  wheels: "/wheels",
  scopeOutlet: "/scope-outlet",
  cyclingShoes: "/cycling-shoes",
  lafugaWear: "/lafuga-wear",
  glasses: "/glasses",
  accessories: "/accessories",
  cyclingHelmets: "/cycling-helmets",
  usedBikes: "/used-bikes",
  cleats: "/cleats",
  groupSets: "/group-sets",
} as const;

/** Webshop-submenu (mobiel + homepage-categorieën). */
export const WEBSHOP_MENU_LINKS: ShopMenuLink[] = [
  { href: BERGASPORTS_CATEGORY_PATHS.cyclingShoes, label: "Wielrenschoenen" },
  { href: BERGASPORTS_CATEGORY_PATHS.wheels, label: "Fietwielen" },
  { href: BERGASPORTS_CATEGORY_PATHS.bikes, label: "Racefietsen" },
  { href: BERGASPORTS_CATEGORY_PATHS.speedSkates, label: "Skeelers" },
  { href: BERGASPORTS_CATEGORY_PATHS.lafugaWear, label: "LaFuga kleding" },
  { href: BERGASPORTS_CATEGORY_PATHS.glasses, label: "Brillen" },
  { href: BERGASPORTS_CATEGORY_PATHS.accessories, label: "Accessoires" },
  { href: BERGASPORTS_CATEGORY_PATHS.scopeOutlet, label: "Scope outlet" },
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
        { href: BERGASPORTS_CATEGORY_PATHS.bikes, label: "Racefietsen" },
        { href: BERGASPORTS_CATEGORY_PATHS.speedSkates, label: "Skeelers" },
        { href: BERGASPORTS_CATEGORY_PATHS.usedBikes, label: "Tweedehands fietsen" },
      ],
    },
    {
      title: "Wielen",
      links: [
        { href: BERGASPORTS_CATEGORY_PATHS.wheels, label: "Fietwielen" },
        { href: BERGASPORTS_CATEGORY_PATHS.scopeOutlet, label: "Scope outlet" },
      ],
    },
    {
      title: "Schoenen & kleding",
      links: [
        { href: BERGASPORTS_CATEGORY_PATHS.cyclingShoes, label: "Wielrenschoenen" },
        { href: BERGASPORTS_CATEGORY_PATHS.lafugaWear, label: "LaFuga kleding" },
      ],
    },
    {
      title: "Accessoires",
      links: [
        { href: BERGASPORTS_CATEGORY_PATHS.glasses, label: "Brillen" },
        { href: BERGASPORTS_CATEGORY_PATHS.accessories, label: "Alle accessoires" },
        { href: BERGASPORTS_CATEGORY_PATHS.cyclingHelmets, label: "Fietshelmen" },
        { href: BERGASPORTS_CATEGORY_PATHS.cleats, label: "Schoenplaatjes" },
        { href: BERGASPORTS_CATEGORY_PATHS.groupSets, label: "Groepssets" },
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
  | { type: "dropdown"; label: string; items: ShopMenuLink[] };

/** Links van het logo (desktop). */
export const HEADER_NAV_LEFT: HeaderNavItem[] = [
  { type: "dropdown", label: "Webshop", items: WEBSHOP_MENU_LINKS },
  { type: "link", href: BERGASPORTS_CATEGORY_PATHS.lafugaWear, label: "LaFuga kleding", badge: "NEW" },
];

/** Rechts van het logo, vóór de iconen (desktop). */
export const HEADER_NAV_RIGHT: HeaderNavItem[] = [
  { type: "link", href: "/despre-noi", label: "Over ons" },
  { type: "link", href: "/contact", label: "Onderhoud" },
  { type: "link", href: "/contact", label: "Contact" },
];

/** Volledige lijst (mobiel menu). */
export const HEADER_NAV_ITEMS: HeaderNavItem[] = [...HEADER_NAV_LEFT, ...HEADER_NAV_RIGHT];

export const HOME_INTRO = {
  title: "Exclusieve racefietsen & topservice voor de echte fietser",
  lead:
    "Bij Bergasports draait alles om prestaties, kwaliteit en persoonlijke service. Wij bieden een exclusieve selectie van topmerken zoals Colnago, Cipollini, Polygon, Titici en Orbea, gecombineerd met accessoires van hoge kwaliteit en deskundig advies. Of je nu op zoek bent naar de perfecte racefiets, eersteklas fietsonderdelen of professioneel advies op maat, bij ons ben je aan het juiste adres.",
  cta: "Bekijk onze producten",
} as const;

export const HOME_VALUE_PROPS = [
  {
    title: "Exclusieve selectie van topmerken",
    text: "Zorgvuldig samengestelde collectie racefietsen van Colnago, Cipollini, Titici, Orbea en Sensa — hoge kwaliteit, geavanceerde technologie en ultiem comfort.",
  },
  {
    title: "Hoogwaardige accessoires & onderdelen",
    text: "Wielen van Scope, Ere en Campagnolo, Nimbl fietsschoenen en meer — ontworpen om je prestaties en rijervaring te verbeteren.",
  },
  {
    title: "Deskundig en persoonlijk advies",
    text: "Ons team helpt je de juiste fiets en accessoires te kiezen, afgestemd op jouw doelen — persoonlijk en klantgericht.",
  },
] as const;

export const HOME_ABOUT = {
  title: "Over mij",
  text: "Van 2004 tot 2022 heb ik professioneel kunnen schaatsen en skeeleren. Een prachtige carrière en resultaten waar ik met trots op terugkijk. Als trainer begeleid ik momenteel de nieuwe generatie marathonschaatsers. Omdat ik als geen ander weet hoe belangrijk het is om met goed materiaal te werken, help ik met bergasports.com veel atleten bij het kiezen van hun ideale materiaal. Of het nu gaat om een complete racefiets, fietswielen, schoenen of een goede bril — bij mij ben je aan het juiste adres.",
  cta: "Mijn verhaal",
} as const;

export const HOME_APPOINTMENT = {
  title: "Persoonlijk advies? Maak vrijblijvend een afspraak",
  text: "Wil je advies over de beste racefiets, onderdelen of accessoires voor jouw rijstijl? Of heb je vragen over onderhoud en reparaties? Plan een persoonlijk adviesgesprek in bij Bergasports in Dedemsvaart!",
  phoneCta: "Bel ons als je vragen hebt!",
} as const;

export const SITE_META_DESCRIPTION =
  "Fietsenwinkel in Dedemsvaart — Orbea, Colnago, Basso, Cervélo, Nimbl en meer. Racefietsen, wielen, schoenen en persoonlijk advies.";
