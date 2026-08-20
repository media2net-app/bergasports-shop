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
    collectionsTitle: "Fietsen, Nimbl en kleding",
    collectionsText:
      "Drie collecties die we zelf gebruiken en in Dedemsvaart adviseren: race, gravel en mountainbike, wielrenschoenen van Nimbl, plus fietskleding.",
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
    // Cookies
    cookieTitle: "Jouw privacy telt",
    cookieBody:
      "We gebruiken essentiële cookies voor winkelwagen en bestelling. Met jouw toestemming kunnen we ook analytische en marketingcookies gebruiken. Je kunt je keuze altijd aanpassen.",
    cookieMoreIn: "Meer in",
    cookiePolicy: "cookiebeleid",
    cookieAcceptAll: "Alles accepteren",
    cookieCustomize: "Aanpassen",
    cookieEssentialOnly: "Alleen essentieel",
    cookieEssential: "Essentieel",
    cookieEssentialDesc: "winkelwagen, sessie, beveiliging (verplicht)",
    cookieAnalytics: "Analytisch",
    cookieAnalyticsDesc: "geaggregeerde statistieken over sitegebruik (bezoeken, pagina's, winkelwagen)",
    cookieMarketing: "Marketing",
    cookieMarketingDesc: "campagnemeting (bijv. TikTok) en remarketing",
    cookieSave: "Voorkeuren opslaan",
    cookieBack: "Terug",
    reviewsCount: (n: number) => (n === 1 ? "1 beoordeling" : `${n} beoordelingen`),
    close: "Sluiten",
    orderNumberLabel: (num: string) =>
      `Bestelnummer ${num}. We nemen contact op voor bevestiging en levering.`,
    and: "en",
    // Shop listing
    categoryNotFound: "Categorie niet gevonden",
    categoryMissingHint:
      "Deze categorie bestaat niet in onze catalogus. Kies een categorie in het menu of bekijk alle producten.",
    activeFilters: (list: string) => `Actieve filters: ${list}.`,
    searchNote: (q: string) => `Zoeken: „${q}”.`,
    noSearchResults: "Geen resultaten voor deze zoekopdracht. Probeer een andere term of",
    clearSearch: "wis de zoekopdracht",
    clearSearchShort: "Wis zoekopdracht",
    orBrowse: "Of bekijk:",
    noProductsInCategory: "Er zijn momenteel geen producten in deze categorie.",
    noProductsMatchFilters: "Geen producten voldoen aan de geselecteerde filters. Probeer filters te verwijderen.",
    productsShownZero: "0 producten getoond.",
    productsCount: (n: number) => `${n} product${n === 1 ? "" : "en"}`,
    inCatalog: " in de Bergasports-catalogus",
    inCategory: (label: string) => ` in ${label}`,
    rangeOfTotal: (from: number, to: number, total: number, page: number, pages: number) =>
      ` · ${from}–${to} van ${total} (pagina ${page} van ${pages})`,
    pageOf: (page: number, pages: number) => `Pagina ${page} van ${pages}`,
    previous: "Vorige",
    next: "Volgende",
    paginationAria: "Paginering webshop",
    clearAllFilters: "Wis alle filters",
    clearFilters: "Wis filters",
    noActiveFilters: "Geen actieve filters",
    sortBy: "Sorteren",
    sortRelevance: "Relevantie",
    sortPriceAsc: "Prijs: laag → hoog",
    sortPriceDesc: "Prijs: hoog → laag",
    sortNameAsc: "Naam A–Z",
    sortNewest: "Nieuwste",
    showMore: "Meer tonen",
    showLess: "Minder tonen",
    filters: "Filters",
    filtersAria: "Filters merk, eigenschappen, kleur en maat",
    brand: "Merk",
    color: "Kleur",
    shoeSizeEu: "Schoenmaat (EU)",
    frameSize: "Framemaat",
    clothingSize: "Kledingmaat",
    wheelSize: "Wielmaat",
    size: "Maat",
    outOfStock: "Niet op voorraad",
    inStock: "Op voorraad",
    merchOffers: "Aanbiedingen",
    merchPopular: "Populair",
    merchNew: "Nieuw",
    popularInCategory: "Populaire producten in deze categorie",
    relatedCategories: "Gerelateerde categorieën",
    viewFullShop: "Bekijk de volledige Bergasports-webshop",
    categoryInfoAria: "Categorie-informatie",
    readMore: "Lees meer",
    less: "Minder",
    // Cart extras
    itemCount: (n: number) => (n === 1 ? "1 artikel" : `${n} artikelen`),
    confirmation: "Bevestiging",
    amountDue: "Te betalen",
    discount: "Korting",
    total: "Totaal",
    subtotal: "Subtotaal",
    variant: "Variant",
    qtyDecrease: "Aantal verlagen",
    qtyIncrease: "Aantal verhogen",
    quantity: "Aantal",
    removeItem: (name: string) => `${name} verwijderen`,
    perPiece: "p.st.",
    savings: "Besparing",
    paySafeWith: (names: string) => `Veilig betalen met ${names}`,
    paySafeMollie: "Veilig betalen via Mollie",
    freePickupDedemsvaart: "Gratis ophalen in Dedemsvaart",
    // Checkout
    checkoutStepsAria: "Checkout stappen",
    checkoutStepDelivery: "1. Bezorging",
    checkoutStepConfirm: "2. Bevestigen",
    deliveryDetails: "Bezorggegevens",
    payOnline: "Online betalen",
    payUnavailable:
      "Online betalen is tijdelijk niet beschikbaar. Kies alvast een methode of neem contact op.",
    payUnavailableShort:
      "Online betalen is tijdelijk niet beschikbaar. Probeer later opnieuw of neem contact op.",
    payUnavailableConfirm:
      "Online betalen is tijdelijk niet beschikbaar. Neem contact op of probeer later opnieuw.",
    payFallbackHint:
      "Kies hier je betaalmethode. Staat die niet aan, dan kies je verder op de beveiligde Mollie-pagina.",
    payViaMollie: (names: string) => `${names} — veilig via Mollie.`,
    payFallbackConfirm:
      "Kies je methode hier. Als Mollie deze niet aan heeft staan, kies je verder op hun betaalpagina.",
    country: "Land",
    countryNl: "Nederland",
    countryBe: "België",
    countryDe: "Duitsland",
    countryEu: "Overig EU",
    couponPlaceholder: "Kortingscode",
    applyCoupon: "Toepassen",
    fullName: "Volledige naam",
    fieldPhone: "Telefoon",
    fieldEmail: "E-mail",
    fieldAddress: "Adres (straat + huisnummer)",
    fieldCity: "Plaats",
    fieldProvince: "Provincie",
    fieldPostal: "Postcode",
    fieldNotes: "Opmerkingen",
    marketingConsent:
      "Ik wil aanbiedingen en nieuws per e-mail ontvangen (optioneel) — inclusief welkomstkorting. Je kunt je altijd uitschrijven.",
    legalConsentPrefix: "Ik ga akkoord met de",
    termsOfService: "algemene voorwaarden",
    privacyPolicyShort: "privacybeleid",
    returnsPolicy: "retourbeleid",
    continueToConfirm: "Ga naar bevestiging",
    confirmOrder: "Bevestig bestelling",
    payment: "Betaling",
    chooseAtMollie: "Kies bij Mollie",
    continueToPay: "Doorgaan naar betalen",
    backToDelivery: "Terug naar bezorggegevens",
    busy: "Bezig…",
    errFillDetails: "Vul naam, telefoon, adres en plaats in.",
    errEmailRequired: "E-mail is verplicht voor online betalen.",
    errAcceptLegal: "Accepteer de algemene voorwaarden en het privacybeleid.",
    errInvalidCoupon: "Ongeldige code",
    errOrderFailed: "De bestelling kon niet worden geplaatst.",
    errNetworkRetry: "Netwerkfout. Probeer het opnieuw.",
    // PDP
    freeShippingNlBadge: "Gratis verzending naar NL",
    sameDayShipping: "Zelfde dag verzonden",
    fastDelivery: "Snelle levering",
    flashSale: "Flash-aanbieding",
    specsContactFallbackPrefix: "Voor maten, materiaal of andere technische details kun je contact opnemen via de",
    specsContactFallbackLink: "contact",
    specsContactFallbackSuffix: ".",
    sizeAdviceTitle: "Twijfel je over maat of model?",
    sizeAdviceText:
      "Ingmar denkt met je mee — bel, mail of kom langs in Dedemsvaart voor persoonlijk advies.",
    whyThisModel: "Waarom dit model?",
    whyLine1: "Geselecteerd op performance, pasvorm en rijstijl.",
    whyLine2: "Persoonlijk advies over maat, groepset en wielkeuze.",
    whyLine3: "Montage en afstelling in onze eigen werkplaats.",
    whoIsThisFor: "Voor wie is dit geschikt?",
    whoIsThisForText:
      "Voor renners die kwaliteit zoeken en materiaal willen dat past bij training, wedstrijd of lange ritten. Weet je niet welke maat je nodig hebt? Dan meten we je op in de winkel voordat je bestelt.",
    productDescription: "Productbeschrijving",
    specifications: "Specificaties",
    productCode: "Productcode",
    productType: "Type",
    rating: "Beoordeling",
    category: "Categorie",
    similarProducts: "Vergelijkbare producten",
    viewMore: "Bekijk meer",
    productNotFound: "Product niet gevonden",
    breadcrumbAria: "Kruimelpad",
    prevImage: "Vorige afbeelding",
    nextImage: "Volgende afbeelding",
    viewImageN: (n: number) => `Afbeelding ${n} bekijken`,
    galleryThumbAlt: (name: string, n: number) => `${name} miniatuur ${n}`,
    promoOldPrice: "OUDE PRIJS:",
    promoSalePrice: "ACTIEPRIJS:",
    promoYouSave: (amount: string) => `Je bespaart: ${amount}`,
    promoHours: "UUR",
    promoMinutes: "MIN",
    promoSeconds: "SEC",
    promoLastPieces: "• Op voorraad — laatste stuks!",
    promoHurry: "Wees er snel bij!",
    promoOrderNow: "Nu bestellen",
    promoCod: "Rembours bij aflevering",
    promoOr: "OF",
    promoPhoneOrder: (phone: string) => `TELEFOONBESTELLING ${phone}`,
    outOfStockNotice:
      "Momenteel niet op voorraad — je kunt dit product niet toevoegen. Neem contact op voor beschikbaarheid.",
    chooseAVariant: "Kies een variant",
    chosen: "Gekozen:",
    noChoiceYet: "Nog geen keuze gemaakt",
    fromPrice: "vanaf",
    youSave: (amount: string) => `Je bespaart ${amount}`,
    inclVat: "Incl. btw",
    inclVatRange: "Incl. btw · prijs volgt na variantkeuze",
    trustShippingReturnsPay: "Verzending, retour en betaling",
    deliveredBetween: "Bezorgd tussen",
    freeShippingNlShort: "· gratis verzending naar NL",
    freeShippingFrom: (amount: string) => `· gratis verzending NL vanaf ${amount}`,
    returnsDays: (days: number) => `${days} dagen`,
    coolingOff: "bedenktijd —",
    returnsConditions: "retourvoorwaarden",
    paySafeIdeal: "Veilig betalen met iDEAL, Apple Pay of creditcard via Mollie",
    freePickupAppointment: "Gratis afhalen op afspraak in Dedemsvaart",
    estimatedDelivery: "Geschatte levering",
    orderNowDelivery: (range: string) =>
      `Bestel nu — levering tussen ${range} (Nederland en België, werkdagen).`,
    shippingCost: "Verzendkosten",
    freeShippingThisOrder: "Gratis verzending naar Nederland voor deze bestelling.",
    addMoreForFreeShipping: (amount: string, from: string) =>
      `Voeg nog ${amount} toe voor gratis verzending naar Nederland (vanaf ${from}).`,
    freeShippingFromThreshold: (from: string) =>
      `Gratis verzending naar Nederland vanaf ${from}. Onder dit bedrag berekenen we de verzendkosten bij bevestiging.`,
    returnsHeading: "Retour",
    returnsBody: (days: number) =>
      `Je hebt ${days} kalenderdagen om te retourneren, volgens ons beleid.`,
    shippingAndReturns: "Verzending & retour",
    shippingReturnsAria: "Verzending en retour",
    // Forms / account / content
    fieldName: "Naam",
    fieldMessage: "Bericht",
    fieldPassword: "Wachtwoord",
    leadEyebrowAppointment: "Afspraak",
    leadEyebrowLafuga: "Maatwerk",
    leadEyebrowContact: "Bericht",
    leadTitleAppointment: "Plan een afspraak",
    leadTitleLafuga: "Maatwerk aanvragen",
    leadTitleContact: "Stuur een bericht",
    leadIntroAppointment:
      "Vertel kort waarvoor je komt: advies, passen of onderhoud. We bevestigen per telefoon of e-mail.",
    leadIntroLafuga:
      "Vertel over jouw club, bedrijf of team: aantallen, sport (fiets/skeeler), kleuren en gewenste timing. We reageren meestal dezelfde werkdag.",
    leadIntroContact:
      "Vragen over een bestelling, de winkel of een product? Vermeld het ordernummer als je die hebt.",
    preferredDateTime: "Voorkeursdatum en -tijd",
    pickOpeningHours: "Kies een moment in de openingstijden",
    placeholderAppointment: "Bijv. Nimbl passen, onderhoudsbeurt of advies over een gravelbike",
    placeholderLafuga: "Bijv. 20 truien + 20 broeken, clubkleuren, levering voor seizoensstart",
    placeholderContact: "Waarmee kunnen we je helpen?",
    sendMessage: "Bericht versturen",
    requestCustom: "Maatwerk aanvragen",
    sending: "Verzenden…",
    sendFailed: "Verzenden mislukt",
    noConnection: "Geen verbinding",
    leadThanks: "Bedankt, we nemen zo snel mogelijk contact op — meestal dezelfde werkdag.",
    legalAcceptPrefix: "Ik ga akkoord met de",
    legalAcceptAnd: "en het",
    ctaAdviceEyebrow: "Persoonlijk advies",
    ctaAdviceTitle: "Plan een afspraak in Dedemsvaart",
    ctaAdviceText:
      "Nieuwe fiets, Nimbl passen, onderhoud of een upgrade: we kijken naar jouw rijstijl — niet naar een standaardpakket.",
    toShop: "Naar de shop",
    login: "Inloggen",
    createAccount: "Account aanmaken",
    register: "Registreren",
    accountOptional:
      "Guest checkout blijft mogelijk — een account is optioneel.",
    loggedIn: "Je bent ingelogd.",
    noAccountRegister: "Nog geen account? Registreren",
    haveAccountLogin: "Heb je al een account? Inloggen",
    failed: "Mislukt",
    networkError: "Netwerkfout",
    newsInspiration: "Nieuws & inspiratie",
    newsEmptyListing:
      "Nog geen berichten. Zodra er nieuws is — een nieuwe fiets, een pasavond of een wedstrijd — staat het hier.",
    preferBrowse: "Liever meteen kijken?",
    lastUpdated: "Laatst bijgewerkt:",
    appointmentIntro:
      "Advies, Nimbl of LaFuga passen, onderhoud of een nieuwe fiets. Vul het formulier in — we bevestigen meestal dezelfde werkdag.",
    orderCompleteTitle: "Bestelling afgerond",
    orderNotFound: "Bestelling niet gevonden",
    orderNotFoundText: "We konden deze bestelling niet laden. Check je e-mail of neem contact op.",
    backToShop: "Terug naar de shop",
    paid: "Betaald",
    thanksOrder: "Bedankt voor je bestelling",
    orderPaid: (num: string) => `Bestelling ${num} is betaald`,
    confirmationTo: (email: string) => ` — bevestiging gaat naar ${email}`,
    paymentPending: "Betaling nog niet bevestigd",
    pleaseWait: "Even geduld",
    orderAwaitingMollie: (num: string) =>
      `Bestelling ${num} wacht nog op bevestiging van Mollie. Vernieuw deze pagina over een paar seconden, of check je e-mail.`,
    refreshStatus: "Status vernieuwen",
    pickDate: "Kies een datum",
    pickTime: "Kies een tijd",
    pickDateTime: "Kies datum en tijd",
    prevMonth: "Vorige maand",
    nextMonth: "Volgende maand",
    noTimesAvailable: "Geen tijden beschikbaar op deze dag.",
    weekdaysShort: ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"] as const,
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
    collectionsTitle: "Bikes, Nimbl and apparel",
    collectionsText:
      "Three collections we use ourselves and advise on in Dedemsvaart: road, gravel and mountain bike, Nimbl cycling shoes, plus cycling apparel.",
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
    cookieTitle: "Your privacy matters",
    cookieBody:
      "We use essential cookies for the cart and checkout. With your consent we may also use analytics and marketing cookies. You can change your choice anytime.",
    cookieMoreIn: "More in our",
    cookiePolicy: "cookie policy",
    cookieAcceptAll: "Accept all",
    cookieCustomize: "Customize",
    cookieEssentialOnly: "Essential only",
    cookieEssential: "Essential",
    cookieEssentialDesc: "cart, session, security (required)",
    cookieAnalytics: "Analytics",
    cookieAnalyticsDesc: "aggregated site usage stats (visits, pages, cart)",
    cookieMarketing: "Marketing",
    cookieMarketingDesc: "campaign measurement (e.g. TikTok) and remarketing",
    cookieSave: "Save preferences",
    cookieBack: "Back",
    reviewsCount: (n: number) => (n === 1 ? "1 review" : `${n} reviews`),
    close: "Close",
    orderNumberLabel: (num: string) =>
      `Order number ${num}. We’ll contact you to confirm and arrange delivery.`,
    and: "and",
    categoryNotFound: "Category not found",
    categoryMissingHint:
      "This category is not in our catalog. Pick a category from the menu or browse all products.",
    activeFilters: (list: string) => `Active filters: ${list}.`,
    searchNote: (q: string) => `Search: “${q}”.`,
    noSearchResults: "No results for this search. Try another term or",
    clearSearch: "clear the search",
    clearSearchShort: "Clear search",
    orBrowse: "Or browse:",
    noProductsInCategory: "There are currently no products in this category.",
    noProductsMatchFilters: "No products match the selected filters. Try removing some filters.",
    productsShownZero: "0 products shown.",
    productsCount: (n: number) => `${n} product${n === 1 ? "" : "s"}`,
    inCatalog: " in the Bergasports catalog",
    inCategory: (label: string) => ` in ${label}`,
    rangeOfTotal: (from: number, to: number, total: number, page: number, pages: number) =>
      ` · ${from}–${to} of ${total} (page ${page} of ${pages})`,
    pageOf: (page: number, pages: number) => `Page ${page} of ${pages}`,
    previous: "Previous",
    next: "Next",
    paginationAria: "Shop pagination",
    clearAllFilters: "Clear all filters",
    clearFilters: "Clear filters",
    noActiveFilters: "No active filters",
    sortBy: "Sort",
    sortRelevance: "Relevance",
    sortPriceAsc: "Price: low → high",
    sortPriceDesc: "Price: high → low",
    sortNameAsc: "Name A–Z",
    sortNewest: "Newest",
    showMore: "Show more",
    showLess: "Show less",
    filters: "Filters",
    filtersAria: "Filters for brand, attributes, color and size",
    brand: "Brand",
    color: "Color",
    shoeSizeEu: "Shoe size (EU)",
    frameSize: "Frame size",
    clothingSize: "Clothing size",
    wheelSize: "Wheel size",
    size: "Size",
    outOfStock: "Out of stock",
    inStock: "In stock",
    merchOffers: "Sale",
    merchPopular: "Popular",
    merchNew: "New",
    popularInCategory: "Popular products in this category",
    relatedCategories: "Related categories",
    viewFullShop: "Browse the full Bergasports shop",
    categoryInfoAria: "Category information",
    readMore: "Read more",
    less: "Less",
    itemCount: (n: number) => (n === 1 ? "1 item" : `${n} items`),
    confirmation: "Confirmation",
    amountDue: "Amount due",
    discount: "Discount",
    total: "Total",
    subtotal: "Subtotal",
    variant: "Variant",
    qtyDecrease: "Decrease quantity",
    qtyIncrease: "Increase quantity",
    quantity: "Quantity",
    removeItem: (name: string) => `Remove ${name}`,
    perPiece: "each",
    savings: "Savings",
    paySafeWith: (names: string) => `Pay securely with ${names}`,
    paySafeMollie: "Pay securely via Mollie",
    freePickupDedemsvaart: "Free pickup in Dedemsvaart",
    checkoutStepsAria: "Checkout steps",
    checkoutStepDelivery: "1. Delivery",
    checkoutStepConfirm: "2. Confirm",
    deliveryDetails: "Delivery details",
    payOnline: "Pay online",
    payUnavailable:
      "Online payment is temporarily unavailable. Pick a method for later or contact us.",
    payUnavailableShort:
      "Online payment is temporarily unavailable. Try again later or contact us.",
    payUnavailableConfirm:
      "Online payment is temporarily unavailable. Contact us or try again later.",
    payFallbackHint:
      "Choose your payment method here. If it isn’t enabled, you’ll pick it on Mollie’s secure page.",
    payViaMollie: (names: string) => `${names} — securely via Mollie.`,
    payFallbackConfirm:
      "Choose your method here. If Mollie doesn’t have it enabled, you’ll continue on their payment page.",
    country: "Country",
    countryNl: "Netherlands",
    countryBe: "Belgium",
    countryDe: "Germany",
    countryEu: "Other EU",
    couponPlaceholder: "Discount code",
    applyCoupon: "Apply",
    fullName: "Full name",
    fieldPhone: "Phone",
    fieldEmail: "Email",
    fieldAddress: "Address (street + number)",
    fieldCity: "City",
    fieldProvince: "Province",
    fieldPostal: "Postal code",
    fieldNotes: "Notes",
    marketingConsent:
      "I’d like to receive offers and news by email (optional) — including a welcome discount. You can unsubscribe anytime.",
    legalConsentPrefix: "I agree to the",
    termsOfService: "terms and conditions",
    privacyPolicyShort: "privacy policy",
    returnsPolicy: "returns policy",
    continueToConfirm: "Continue to confirmation",
    confirmOrder: "Confirm order",
    payment: "Payment",
    chooseAtMollie: "Choose at Mollie",
    continueToPay: "Continue to payment",
    backToDelivery: "Back to delivery details",
    busy: "Working…",
    errFillDetails: "Please enter name, phone, address and city.",
    errEmailRequired: "Email is required for online payment.",
    errAcceptLegal: "Please accept the terms and privacy policy.",
    errInvalidCoupon: "Invalid code",
    errOrderFailed: "The order could not be placed.",
    errNetworkRetry: "Network error. Please try again.",
    freeShippingNlBadge: "Free shipping to NL",
    sameDayShipping: "Ships same day",
    fastDelivery: "Fast delivery",
    flashSale: "Flash sale",
    specsContactFallbackPrefix: "For sizes, materials or other technical details, contact us via",
    specsContactFallbackLink: "contact",
    specsContactFallbackSuffix: ".",
    sizeAdviceTitle: "Unsure about size or model?",
    sizeAdviceText:
      "Ingmar is happy to help — call, email or visit us in Dedemsvaart for personal advice.",
    whyThisModel: "Why this model?",
    whyLine1: "Selected for performance, fit and riding style.",
    whyLine2: "Personal advice on size, groupset and wheel choice.",
    whyLine3: "Built and tuned in our own workshop.",
    whoIsThisFor: "Who is this for?",
    whoIsThisForText:
      "For riders who want quality gear that fits training, racing or long rides. Not sure which size you need? We’ll measure you in the shop before you order.",
    productDescription: "Product description",
    specifications: "Specifications",
    productCode: "Product code",
    productType: "Type",
    rating: "Rating",
    category: "Category",
    similarProducts: "Similar products",
    viewMore: "View more",
    productNotFound: "Product not found",
    breadcrumbAria: "Breadcrumb",
    prevImage: "Previous image",
    nextImage: "Next image",
    viewImageN: (n: number) => `View image ${n}`,
    galleryThumbAlt: (name: string, n: number) => `${name} thumbnail ${n}`,
    promoOldPrice: "WAS:",
    promoSalePrice: "SALE PRICE:",
    promoYouSave: (amount: string) => `You save: ${amount}`,
    promoHours: "HRS",
    promoMinutes: "MIN",
    promoSeconds: "SEC",
    promoLastPieces: "• In stock — last pieces!",
    promoHurry: "Hurry while stocks last!",
    promoOrderNow: "Order now",
    promoCod: "Cash on delivery",
    promoOr: "OR",
    promoPhoneOrder: (phone: string) => `PHONE ORDER ${phone}`,
    outOfStockNotice:
      "Currently out of stock — you can’t add this product. Contact us about availability.",
    chooseAVariant: "Choose a variant",
    chosen: "Selected:",
    noChoiceYet: "No selection yet",
    fromPrice: "from",
    youSave: (amount: string) => `You save ${amount}`,
    inclVat: "Incl. VAT",
    inclVatRange: "Incl. VAT · price updates after variant choice",
    trustShippingReturnsPay: "Shipping, returns and payment",
    deliveredBetween: "Delivered between",
    freeShippingNlShort: "· free shipping to NL",
    freeShippingFrom: (amount: string) => `· free NL shipping from ${amount}`,
    returnsDays: (days: number) => `${days} days`,
    coolingOff: "cooling-off —",
    returnsConditions: "return conditions",
    paySafeIdeal: "Pay securely with iDEAL, Apple Pay or card via Mollie",
    freePickupAppointment: "Free pickup by appointment in Dedemsvaart",
    estimatedDelivery: "Estimated delivery",
    orderNowDelivery: (range: string) =>
      `Order now — delivery between ${range} (Netherlands and Belgium, business days).`,
    shippingCost: "Shipping cost",
    freeShippingThisOrder: "Free shipping to the Netherlands on this order.",
    addMoreForFreeShipping: (amount: string, from: string) =>
      `Add ${amount} more for free shipping to the Netherlands (from ${from}).`,
    freeShippingFromThreshold: (from: string) =>
      `Free shipping to the Netherlands from ${from}. Below that we calculate shipping at confirmation.`,
    returnsHeading: "Returns",
    returnsBody: (days: number) =>
      `You have ${days} calendar days to return, according to our policy.`,
    shippingAndReturns: "Shipping & returns",
    shippingReturnsAria: "Shipping and returns",
    fieldName: "Name",
    fieldMessage: "Message",
    fieldPassword: "Password",
    leadEyebrowAppointment: "Appointment",
    leadEyebrowLafuga: "Custom",
    leadEyebrowContact: "Message",
    leadTitleAppointment: "Book an appointment",
    leadTitleLafuga: "Request custom gear",
    leadTitleContact: "Send a message",
    leadIntroAppointment:
      "Tell us briefly what you need: advice, fitting or service. We’ll confirm by phone or email.",
    leadIntroLafuga:
      "Tell us about your club, company or team: quantities, sport (bike/skating), colors and timing. We usually reply the same business day.",
    leadIntroContact:
      "Questions about an order, the shop or a product? Include your order number if you have one.",
    preferredDateTime: "Preferred date and time",
    pickOpeningHours: "Pick a time within opening hours",
    placeholderAppointment: "e.g. Nimbl fitting, service or gravel bike advice",
    placeholderLafuga: "e.g. 20 jerseys + 20 shorts, club colors, delivery before season start",
    placeholderContact: "How can we help?",
    sendMessage: "Send message",
    requestCustom: "Request custom gear",
    sending: "Sending…",
    sendFailed: "Could not send",
    noConnection: "No connection",
    leadThanks: "Thanks — we’ll get back to you as soon as possible, usually the same business day.",
    legalAcceptPrefix: "I agree to the",
    legalAcceptAnd: "and the",
    ctaAdviceEyebrow: "Personal advice",
    ctaAdviceTitle: "Book an appointment in Dedemsvaart",
    ctaAdviceText:
      "New bike, Nimbl fitting, service or an upgrade: we look at your riding style — not a one-size package.",
    toShop: "Go to the shop",
    login: "Log in",
    createAccount: "Create account",
    register: "Register",
    accountOptional: "Guest checkout remains available — an account is optional.",
    loggedIn: "You’re logged in.",
    noAccountRegister: "No account yet? Register",
    haveAccountLogin: "Already have an account? Log in",
    failed: "Failed",
    networkError: "Network error",
    newsInspiration: "News & inspiration",
    newsEmptyListing:
      "No posts yet. When there’s news — a new bike, a fitting evening or a race — it’ll show up here.",
    preferBrowse: "Prefer to browse right away?",
    lastUpdated: "Last updated:",
    appointmentIntro:
      "Advice, Nimbl or LaFuga fitting, service or a new bike. Fill in the form — we usually confirm the same business day.",
    orderCompleteTitle: "Order complete",
    orderNotFound: "Order not found",
    orderNotFoundText: "We couldn’t load this order. Check your email or contact us.",
    backToShop: "Back to the shop",
    paid: "Paid",
    thanksOrder: "Thanks for your order",
    orderPaid: (num: string) => `Order ${num} has been paid`,
    confirmationTo: (email: string) => ` — confirmation goes to ${email}`,
    paymentPending: "Payment not confirmed yet",
    pleaseWait: "Please wait",
    orderAwaitingMollie: (num: string) =>
      `Order ${num} is still waiting for Mollie confirmation. Refresh this page in a few seconds, or check your email.`,
    refreshStatus: "Refresh status",
    pickDate: "Pick a date",
    pickTime: "Pick a time",
    pickDateTime: "Pick date and time",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    noTimesAvailable: "No times available on this day.",
    weekdaysShort: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const,
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
      {
        title: t.skates,
        href: BERGASPORTS_CATEGORY_PATHS.speedSkates,
        links: [
          { href: BERGASPORTS_CATEGORY_PATHS.completeSkates, label: "Complete skates" },
          { href: BERGASPORTS_CATEGORY_PATHS.skateShoes, label: "Skate shoes" },
          { href: BERGASPORTS_CATEGORY_PATHS.skateWheels, label: "Skate wheels" },
          { href: BERGASPORTS_CATEGORY_PATHS.skateBearings, label: "Bearings" },
        ],
      },
      {
        title: t.wheels,
        href: BERGASPORTS_CATEGORY_PATHS.wheels,
        links: [
          { href: BERGASPORTS_CATEGORY_PATHS.wheels, label: t.wheels },
          { href: BERGASPORTS_CATEGORY_PATHS.scopeOutlet, label: "Scope Outlet" },
        ],
      },
      {
        title: t.shoesClothing,
        href: BERGASPORTS_CATEGORY_PATHS.shoesClothing,
        links: [
          { href: BERGASPORTS_CATEGORY_PATHS.cyclingShoes, label: "Cycling shoes" },
          { href: BERGASPORTS_CATEGORY_PATHS.lafugaWear, label: "Apparel" },
        ],
      },
      {
        title: t.accessories,
        href: BERGASPORTS_CATEGORY_PATHS.accessories,
        links: [
          { href: BERGASPORTS_CATEGORY_PATHS.cyclingHelmets, label: t.helmets },
          { href: BERGASPORTS_CATEGORY_PATHS.glasses, label: t.glasses },
          { href: BERGASPORTS_CATEGORY_PATHS.groupSets, label: t.groupSets },
          { href: BERGASPORTS_CATEGORY_PATHS.cleats, label: t.cleats },
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
    { type: "link", href: BERGASPORTS_CATEGORY_PATHS.lafugaCustom, label: "LaFuga custom apparel" },
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
    { label: "LaFuga custom apparel", href: BERGASPORTS_CATEGORY_PATHS.lafugaCustom },
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
    { ...HOME_PILLARS[0], title: "Bikes", text: "Road, gravel and mountain bike — brands we ride ourselves." },
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
      text: "Blijf op de hoogte van nieuwe producten, fietsen, LaFuga, events en het laatste Bergasports-nieuws.",
      cta: "Volg ons op Instagram",
      empty: "Nog geen berichten op de site. Volg ons op",
    };
  }
  return {
    title: "Follow Bergasports",
    text: "Stay up to date with new products, bikes, LaFuga, events and the latest Bergasports news.",
    cta: "Follow us on Instagram",
    empty: "No posts on the site yet. Follow us on",
  };
}

export function localizedShopSortOptions(locale: string): { id: string; label: string }[] {
  const t = ui(locale);
  return [
    { id: "relevance", label: t.sortRelevance },
    { id: "price_asc", label: t.sortPriceAsc },
    { id: "price_desc", label: t.sortPriceDesc },
    { id: "name_asc", label: t.sortNameAsc },
    { id: "newest", label: t.sortNewest },
  ];
}

export function localizedMerchViewLabel(
  view: "reduceri" | "noi" | "top",
  locale: string,
): string {
  const t = ui(locale);
  switch (view) {
    case "reduceri":
      return t.merchOffers;
    case "top":
      return t.merchPopular;
    case "noi":
      return t.merchNew;
    default:
      return view;
  }
}

export function localizedSizeFacetGroupTitle(
  kind: "eu" | "frame" | "clothing" | "wheel" | "other",
  locale: string,
): string {
  const t = ui(locale);
  switch (kind) {
    case "eu":
      return t.shoeSizeEu;
    case "frame":
      return t.frameSize;
    case "clothing":
      return t.clothingSize;
    case "wheel":
      return t.wheelSize;
    default:
      return t.size;
  }
}
