/**
 * Storefront UI-chrome (nav, footer, home-secties).
 * Content (producten/CMS) komt uit translations.*; dit is vaste NL/EN UI-copy.
 */

import { DEFAULT_LOCALE } from "@/lib/i18n/locale-codes";
import {
  ABOUT_MENU_LINKS,
  BERGASPORTS_CATEGORY_PATHS,
  HEADER_NAV_LEFT,
  HEADER_NAV_RIGHT,
  HOME_ABOUT,
  HOME_ADVICE,
  HOME_HERO,
  HOME_PILLARS,
  HOME_VISIT,
  MOBILE_NAV_TREE,
  TRUST_BAR_USPS,
  WEBSHOP_MEGA_MENU,
  type HeaderNavItem,
  type ShopMegaMenuColumn,
  type ShopMenuLink,
} from "@/lib/site-content";

export type UiLocale = "nl" | "en";

export function toUiLocale(locale: string | null | undefined): UiLocale {
  return locale === "en" ? "en" : "nl";
}

const STRINGS = {
  nl: {
    webshop: "Webshop",
    news: "Nieuws",
    about: "Over ons",
    myStory: "Mijn verhaal",
    service: "Onderhoud & reparatie",
    brands: "Merken",
    allBrands: "Alle merken",
    categories: "Categorieën",
    shopCategories: "Webshop categorieën",
    mobileMenu: "Mobiel menu",
    contact: "Contact & route",
    allProducts: "Alle producten",
    allIn: (title: string) => `Alles in ${title.toLowerCase()}`,
    bikes: "Fietsen",
    roadBikes: "Racefietsen",
    gravel: "Gravel",
    mtb: "MTB",
    skates: "Skeelers",
    shoesClothing: "Schoenen & kleding",
    accessories: "Accessoires",
    helmets: "Helmen",
    glasses: "Brillen",
    wheels: "Wielen",
    groupSets: "Groepsets",
    cleats: "Schoenplaatjes",
    openMenu: "Menu openen",
    search: "Zoeken",
    closeSearch: "Zoeken sluiten",
    account: "Account",
    cart: "Winkelwagen",
    shop: "Winkel",
    newsLabel: "Nieuws",
    shipping: "Verzending",
    returns: "Retouren",
    aboutBrand: "Bergasports",
    appointment: "Afspraak",
    maintenance: "Onderhoud",
    contactHeading: "Contact",
    openingHours: "Openingstijden",
    closed: "Gesloten",
    terms: "Voorwaarden",
    privacy: "Privacy",
    cookies: "Cookies",
    newsletterEyebrow: (label: string) => `Nieuwsbrief · ${label}`,
    newsletterTitle: "Tips, nieuwe merken en exclusieve korting",
    newsletterText: (label: string) =>
      `Meld je aan en ontvang ${label} op je eerste bestelling. De code krijg je direct na aanmelding (en in je mail). Geen spam — alleen nuttige updates.`,
    newsletterCta: "Aanmelden",
    newsletterBusy: "Bezig…",
    latestNews: "Laatste nieuws",
    fromStore: "Uit de winkel",
    newsIntro: "Updates uit de winkel, nieuwe producten en wat er speelt in Dedemsvaart.",
    viewAll: "Alles bekijken",
    collectionsEyebrow: "Bekijk onze producten",
    collectionsTitle: "Fietsen en Nimbl",
    collectionsText:
      "Twee collecties die we zelf rijden en in Dedemsvaart laten passen: race, gravel en mountainbike, plus wielrenschoenen van Nimbl.",
    allBikes: "Alle fietsen",
    allNimbl: "Alle Nimbl-schoenen",
    emptyCollection: "Nog geen producten in deze collectie.",
    addToCart: "Toevoegen",
    inCart: "In winkelwagen",
    chooseVariant: "Kies variant",
    chooseVariantFirst: "Kies eerst een variant om verder te gaan.",
    safeCheckout: "Veilig afrekenen · geen verborgen kosten",
    viewProduct: "Bekijk product",
    planAppointment: "Plan een afspraak",
    planAppointmentShort: "Plan afspraak",
    planRoute: "Plan je route",
    callPhone: (phone: string) => `Bel ${phone}`,
    viewProducts: "Bekijk alle producten",
    personalAdvice: "Persoonlijk advies in Dedemsvaart",
    megaPromoText:
      "Van racefiets tot wielrenschoenen — met persoonlijk advies helpen we je de juiste keuze te maken.",
    newBadge: "NIEUW",
    view: "Bekijken",
    workshopAdvice: "Werkplaats & advies",
    address: "Adres",
    phone: "Telefoon",
    trustedBrands: "Merken die we vertrouwen",
    ourBrands: "Onze merken",
    moreBrands: "Meer over onze merken",
    newsEmpty: "Binnenkort meer Bergasports-nieuws. Volg ons ondertussen in de winkel of op Instagram.",
    collectionsTabs: "Productcollecties",
    bikesTab: "Fietsen",
    emailAddress: "E-mailadres",
    emailPlaceholder: "jouw@email.nl",
    newsletterOk: "Gelukt — welkom bij Bergasports.",
    newsletterAlready: "Je stond al op de lijst.",
    newsletterCode: "Je kortingscode:",
    newsletterCheckoutHint: "Vul de code in bij het afrekenen. Check ook je inbox.",
    newsletterFail: "Aanmelden mislukt",
    newsletterCodeMissing: "Aanmelden gelukt, maar de code kon niet worden geladen. Check je inbox.",
    newsletterOffline: "Geen verbinding",
    newsletterLegal: "Door je aan te melden ga je akkoord met ons",
    privacyPolicy: "privacybeleid",
    newsletterUnsubscribe: "Uitschrijven kan altijd.",
    searchResults: "Zoekresultaten",
    searchAllResults: "Bekijk alle resultaten in de webshop",
    searching: "Zoeken…",
    searchProducts: "Zoek producten…",
    percentOff: (n: number) => `${n}% korting`,
    cartEmptyTitle: "Nog niets in je mandje",
    cartEmptyText: "Ontdek fietsen, kleding en accessoires — of kom langs in Dedemsvaart.",
    toWebshop: "Naar de webshop",
    viewBikes: "Bekijk fietsen",
    checkout: "Afrekenen",
    orderPlaced: "Bestelling geplaatst",
    closeCart: "Winkelwagen sluiten",
    freeShippingNl: "Gratis verzending naar Nederland. Afhalen in Dedemsvaart is altijd gratis.",
    freeShippingRemaining: (amount: string, from: string) =>
      `Nog ${amount} tot gratis verzending naar Nederland (vanaf ${from}).`,
    continueShopping: "Verder winkelen",
    cookiePrefs: "Cookievoorkeuren",
    days: ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"] as const,
  },
  en: {
    webshop: "Shop",
    news: "News",
    about: "About us",
    myStory: "My story",
    service: "Service & repairs",
    brands: "Brands",
    allBrands: "All brands",
    categories: "Categories",
    shopCategories: "Shop categories",
    mobileMenu: "Mobile menu",
    contact: "Contact & directions",
    allProducts: "All products",
    allIn: (title: string) => `All in ${title.toLowerCase()}`,
    bikes: "Bikes",
    roadBikes: "Road bikes",
    gravel: "Gravel",
    mtb: "MTB",
    skates: "Speed skates",
    shoesClothing: "Shoes & apparel",
    accessories: "Accessories",
    helmets: "Helmets",
    glasses: "Glasses",
    wheels: "Wheels",
    groupSets: "Groupsets",
    cleats: "Cleats",
    openMenu: "Open menu",
    search: "Search",
    closeSearch: "Close search",
    account: "Account",
    cart: "Cart",
    shop: "Shop",
    newsLabel: "News",
    shipping: "Shipping",
    returns: "Returns",
    aboutBrand: "Bergasports",
    appointment: "Appointment",
    maintenance: "Service",
    contactHeading: "Contact",
    openingHours: "Opening hours",
    closed: "Closed",
    terms: "Terms",
    privacy: "Privacy",
    cookies: "Cookies",
    newsletterEyebrow: (label: string) => `Newsletter · ${label}`,
    newsletterTitle: "Tips, new brands and exclusive discounts",
    newsletterText: (label: string) =>
      `Sign up and get ${label} on your first order. You’ll receive the code right after signing up (and by email). No spam — only useful updates.`,
    newsletterCta: "Subscribe",
    newsletterBusy: "Working…",
    latestNews: "Latest news",
    fromStore: "From the shop",
    newsIntro: "Updates from the shop, new products and what’s happening in Dedemsvaart.",
    viewAll: "View all",
    collectionsEyebrow: "Explore our products",
    collectionsTitle: "Bikes and Nimbl",
    collectionsText:
      "Two collections we ride ourselves and fit in Dedemsvaart: road, gravel and mountain bike, plus Nimbl cycling shoes.",
    allBikes: "All bikes",
    allNimbl: "All Nimbl shoes",
    emptyCollection: "No products in this collection yet.",
    addToCart: "Add to cart",
    inCart: "In cart",
    chooseVariant: "Choose variant",
    chooseVariantFirst: "Choose a variant first to continue.",
    safeCheckout: "Secure checkout · no hidden fees",
    viewProduct: "View product",
    planAppointment: "Book an appointment",
    planAppointmentShort: "Book appointment",
    planRoute: "Get directions",
    callPhone: (phone: string) => `Call ${phone}`,
    viewProducts: "View all products",
    personalAdvice: "Personal advice in Dedemsvaart",
    megaPromoText: "From road bikes to cycling shoes — personal advice to help you choose the right setup.",
    newBadge: "NEW",
    view: "View",
    workshopAdvice: "Workshop & advice",
    address: "Address",
    phone: "Phone",
    trustedBrands: "Brands we trust",
    ourBrands: "Our brands",
    moreBrands: "More about our brands",
    newsEmpty: "More Bergasports news coming soon. Follow us in the shop or on Instagram in the meantime.",
    collectionsTabs: "Product collections",
    bikesTab: "Bikes",
    emailAddress: "Email address",
    emailPlaceholder: "you@email.com",
    newsletterOk: "Done — welcome to Bergasports.",
    newsletterAlready: "You were already on the list.",
    newsletterCode: "Your discount code:",
    newsletterCheckoutHint: "Enter the code at checkout. Check your inbox too.",
    newsletterFail: "Sign-up failed",
    newsletterCodeMissing: "Signed up, but the code could not be loaded. Check your inbox.",
    newsletterOffline: "No connection",
    newsletterLegal: "By signing up you agree to our",
    privacyPolicy: "privacy policy",
    newsletterUnsubscribe: "You can unsubscribe anytime.",
    searchResults: "Search results",
    searchAllResults: "View all results in the shop",
    searching: "Searching…",
    searchProducts: "Search products…",
    percentOff: (n: number) => `${n}% off`,
    cartEmptyTitle: "Your cart is empty",
    cartEmptyText: "Discover bikes, apparel and accessories — or visit us in Dedemsvaart.",
    toWebshop: "Go to the shop",
    viewBikes: "View bikes",
    checkout: "Checkout",
    orderPlaced: "Order placed",
    closeCart: "Close cart",
    freeShippingNl: "Free shipping to the Netherlands. Pickup in Dedemsvaart is always free.",
    freeShippingRemaining: (amount: string, from: string) =>
      `${amount} left until free shipping to the Netherlands (from ${from}).`,
    continueShopping: "Continue shopping",
    cookiePrefs: "Cookie preferences",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const,
  },
} as const;

export type UiStrings = (typeof STRINGS)["nl"];

export function ui(locale: string | null | undefined): UiStrings {
  return STRINGS[toUiLocale(locale)] as UiStrings;
}

const DAY_SCHEMA_INDEX: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

export function localizeOpeningHoursRows<T extends { day: string; hours: string; schemaDay?: string }>(
  rows: T[],
  locale: string,
): T[] {
  const t = ui(locale);
  if (toUiLocale(locale) === "nl") {
    return rows.map((row) => ({
      ...row,
      hours: row.hours === "Closed" ? t.closed : row.hours,
    }));
  }
  return rows.map((row) => {
    const idx =
      (row.schemaDay && DAY_SCHEMA_INDEX[row.schemaDay] !== undefined
        ? DAY_SCHEMA_INDEX[row.schemaDay]
        : STRINGS.nl.days.indexOf(row.day as (typeof STRINGS.nl.days)[number]));
    const day = typeof idx === "number" && idx >= 0 ? t.days[idx as 0 | 1 | 2 | 3 | 4 | 5 | 6] : row.day;
    const hours = row.hours === "Gesloten" || row.hours === "Closed" ? t.closed : row.hours;
    return { ...row, day, hours };
  });
}

export function localizedTrustBarUsps(locale: string): readonly string[] {
  if (toUiLocale(locale) === "en") {
    return [
      "Personal advice and expertise",
      "Professional quality for everyone",
      "Exclusive, high-end products",
    ] as const;
  }
  return TRUST_BAR_USPS;
}

export function localizedMegaMenu(locale: string): typeof WEBSHOP_MEGA_MENU {
  const t = ui(locale);
  if (toUiLocale(locale) === "nl") return WEBSHOP_MEGA_MENU;
  return {
    columns: [
      {
        title: t.bikes,
        href: BERGASPORTS_CATEGORY_PATHS.bikes,
        links: [
          { href: BERGASPORTS_CATEGORY_PATHS.roadBikes, label: t.roadBikes },
          { href: BERGASPORTS_CATEGORY_PATHS.gravel, label: t.gravel },
          { href: BERGASPORTS_CATEGORY_PATHS.mtb, label: t.mtb },
        ],
      },
      { title: t.skates, href: BERGASPORTS_CATEGORY_PATHS.speedSkates, links: [] },
      {
        title: t.shoesClothing,
        href: BERGASPORTS_CATEGORY_PATHS.shoesClothing,
        links: [
          { href: BERGASPORTS_CATEGORY_PATHS.cyclingShoes, label: "Nimbl" },
          { href: BERGASPORTS_CATEGORY_PATHS.lafugaWear, label: "LaFuga" },
        ],
      },
      {
        title: t.accessories,
        href: BERGASPORTS_CATEGORY_PATHS.accessories,
        links: [
          { href: BERGASPORTS_CATEGORY_PATHS.cyclingHelmets, label: t.helmets },
          { href: BERGASPORTS_CATEGORY_PATHS.glasses, label: t.glasses },
          { href: BERGASPORTS_CATEGORY_PATHS.wheels, label: t.wheels },
          { href: BERGASPORTS_CATEGORY_PATHS.groupSets, label: t.groupSets },
          { href: BERGASPORTS_CATEGORY_PATHS.cleats, label: t.cleats },
          { href: BERGASPORTS_CATEGORY_PATHS.scopeOutlet, label: "Scope Outlet" },
        ],
      },
    ] satisfies ShopMegaMenuColumn[],
    promo: {
      title: t.personalAdvice,
      text: t.megaPromoText,
      cta: t.planAppointment,
      ctaHref: "/afspraak#formulier",
      shopCta: t.viewProducts,
      shopHref: "/shop",
    },
  };
}

export function localizedAboutLinks(locale: string): ShopMenuLink[] {
  const t = ui(locale);
  if (toUiLocale(locale) === "nl") return ABOUT_MENU_LINKS;
  return [
    { href: "/over-ons", label: t.myStory },
    { href: "/onderhoud", label: t.service },
    { href: "/merken", label: t.brands },
    { href: "/contact", label: t.contact },
  ];
}

export function localizedHeaderNavLeft(locale: string): HeaderNavItem[] {
  const t = ui(locale);
  if (toUiLocale(locale) === "nl") return HEADER_NAV_LEFT;
  return [
    { type: "mega", label: t.webshop },
    { type: "link", href: "/nieuws", label: t.news },
    { type: "link", href: BERGASPORTS_CATEGORY_PATHS.lafugaWear, label: "LaFuga", badge: t.newBadge },
  ];
}

export function localizedHeaderNavRight(locale: string): HeaderNavItem[] {
  const t = ui(locale);
  if (toUiLocale(locale) === "nl") return HEADER_NAV_RIGHT;
  return [{ type: "dropdown", label: t.about, items: localizedAboutLinks(locale) }];
}

export function localizedMobileNavTree(locale: string) {
  const t = ui(locale);
  if (toUiLocale(locale) === "nl") return MOBILE_NAV_TREE;
  const mega = localizedMegaMenu(locale);
  return [
    { label: t.allProducts, href: "/shop" },
    ...mega.columns.map((column) =>
      column.links.length > 0
        ? {
            label: column.title,
            children: [
              ...(column.href ? [{ href: column.href, label: t.allIn(column.title) }] : []),
              ...column.links,
            ],
          }
        : { label: column.title, href: column.href },
    ),
    { label: t.news, href: "/nieuws" },
    { label: "LaFuga", href: BERGASPORTS_CATEGORY_PATHS.lafugaWear, badge: t.newBadge },
    { label: t.about, children: localizedAboutLinks(locale) },
  ];
}

export function localizedHomeHero(locale: string) {
  if (toUiLocale(locale) === "nl") return HOME_HERO;
  return {
    ...HOME_HERO,
    titleLine1: "More than a shop.",
    titleLine2: "Your sports partner.",
    lead: "Personal advice, high-quality gear and years of experience in top-level sport.",
    primaryCta: "View bikes",
    secondaryCta: "Book an appointment",
  };
}

export function localizedHomePillars(locale: string) {
  if (toUiLocale(locale) === "nl") return HOME_PILLARS;
  return [
    { ...HOME_PILLARS[0], title: "Road bikes", text: "Built for speed and performance." },
    { ...HOME_PILLARS[1], title: "Wheels", text: "The right wheelset for your bike and riding style." },
    {
      ...HOME_PILLARS[2],
      title: "Shoes & apparel",
      text: "High-quality gear for training and racing.",
    },
    { ...HOME_PILLARS[3], title: "Accessories", text: "The details that make the difference." },
  ] as const;
}

export function localizedHomeAdvice(locale: string) {
  if (toUiLocale(locale) === "nl") return HOME_ADVICE;
  return {
    ...HOME_ADVICE,
    title: "The right choice starts with good advice",
    text: "Not every rider has the same goals. We look at your riding style, level, fit and gear — whether you ride road, gravel or MTB. Book an appointment in Dedemsvaart, or call and WhatsApp when you need a quick answer.",
    cta: "Book an appointment",
  };
}

export function localizedHomeAbout(locale: string) {
  if (toUiLocale(locale) === "nl") return HOME_ABOUT;
  return {
    ...HOME_ABOUT,
    title: "From top-level sport to Bergasports",
    text: "Two-time Dutch marathon skating champion (2007 and 2013), European marathon inline champion (2010) and Dutch inline champion in 2019. Those years at the highest level — plus a KNSB Marathon Cup classification — are the foundation of Bergasports: gear that fits, advice without the runaround.",
    cta: "Read my story",
  };
}

export function localizedHomeVisit(locale: string) {
  if (toUiLocale(locale) === "nl") return HOME_VISIT;
  return {
    ...HOME_VISIT,
    title: "Visit Bergasports in Dedemsvaart",
    text: "Stop by on Julianastraat for personal advice, Nimbl or LaFuga fitting, a proper check of your road bike, or simply a good cup of coffee.",
    cta: "Contact & directions",
  };
}

export function localizedHomeInstagram(locale: string) {
  if (toUiLocale(locale) === "nl") {
    return {
      title: "Follow Bergasports",
      text: "Stay up to date with new products, bikes, LaFuga, events and the latest Bergasports news.",
      cta: "Follow us on Instagram",
    };
  }
  return {
    title: "Follow Bergasports",
    text: "Stay up to date with new products, bikes, LaFuga, events and the latest Bergasports news.",
    cta: "Follow us on Instagram",
  };
}
