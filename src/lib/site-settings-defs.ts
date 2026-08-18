/**
 * Catalogus van admin-bewerkbare integratiekeys + handleidingen voor Ingmar.
 * Waarden: site_settings (DB) overschrijft process.env.
 */

export type SiteSettingSectionId = "shop" | "products" | "email" | "integrations" | "marketing";

export type SiteSettingGroupId =
  | "store"
  | "shop"
  | "products"
  | "email"
  | "notifications"
  | "payments"
  | "shipping"
  | "easysales"
  | "instagram"
  | "google"
  | "woocommerce"
  | "analytics"
  | "pixels"
  | "seo"
  | "languages";

export type SiteSettingDef = {
  key: string;
  /** Fallback env-naam (vaak gelijk aan key). */
  envKey: string;
  label: string;
  group: SiteSettingGroupId;
  /** Geheim: nooit volle waarde teruggeven aan de browser. */
  secret: boolean;
  optional?: boolean;
  placeholder?: string;
  multiline?: boolean;
  /** Niet tonen in het generieke instellingenformulier (eigen UI). */
  hidden?: boolean;
  manual: {
    summary: string;
    steps: string[];
    links?: { label: string; href: string }[];
    whereUsed: string;
  };
};

export const SITE_SETTING_SECTIONS: {
  id: SiteSettingSectionId;
  title: string;
  intro: string;
}[] = [
  { id: "shop", title: "Shop", intro: "Winkelgegevens, URL en gratis verzending." },
  { id: "products", title: "Producten", intro: "Voorraadwaarschuwingen in het CMS." },
  { id: "email", title: "E-mails", intro: "SMTP en afzender. Mailteksten bewerk je onder E-mails." },
  { id: "integrations", title: "Koppelingen", intro: "Mollie, Sendcloud, Easy Sales, Instagram, Google-reviews." },
  { id: "marketing", title: "Marketing", intro: "Analytics, pixels en zoekmachines." },
];

export const SITE_SETTING_GROUPS: {
  id: SiteSettingGroupId;
  section: SiteSettingSectionId;
  title: string;
  navLabel: string;
  intro: string;
}[] = [
  {
    id: "store",
    section: "shop",
    title: "Winkelgegevens",
    navLabel: "Winkel",
    intro: "Telefoon, e-mail, adres, KvK, BTW, WhatsApp en openingstijden zoals bezoekers die zien.",
  },
  {
    id: "shop",
    section: "shop",
    title: "Shop & verzending",
    navLabel: "URL & verzending",
    intro: "Canonieke shop-URL en drempel voor gratis verzending.",
  },
  {
    id: "languages",
    section: "shop",
    title: "Talen",
    navLabel: "Talen",
    intro: "Voeg talen toe voor de shop. Nederlands blijft de standaardtaal zonder URL-prefix.",
  },
  {
    id: "products",
    section: "products",
    title: "Voorraad",
    navLabel: "Voorraad",
    intro: "Vanaf welk aantal een product in het CMS als bijna uitverkocht geldt.",
  },
  {
    id: "email",
    section: "email",
    title: "Verzenden (SMTP / Resend)",
    navLabel: "Verzenden",
    intro: "Mailserver of Resend-key. Zonder dit gaan ordermails niet de deur uit.",
  },
  {
    id: "notifications",
    section: "email",
    title: "Ordermails & marketing",
    navLabel: "Ordermails",
    intro: "Naar welk adres nieuwe orders gaan, afzender, logo en win-backkorting.",
  },
  {
    id: "payments",
    section: "integrations",
    title: "Betalingen (Mollie)",
    navLabel: "Mollie",
    intro: "Checkout toont de methodes die in het Mollie-dashboard aanstaan (iDEAL, Bancontact, kaarten, …).",
  },
  {
    id: "shipping",
    section: "integrations",
    title: "Verzending (Sendcloud)",
    navLabel: "Sendcloud",
    intro: "Labels, tracking en verzendstatus vanuit het orderbeheer.",
  },
  {
    id: "easysales",
    section: "integrations",
    title: "Easy Sales",
    navLabel: "Easy Sales",
    intro: "Voorraad- en ordersync met Easy Sales.",
  },
  {
    id: "instagram",
    section: "integrations",
    title: "Instagram",
    navLabel: "Instagram",
    intro: "Live feed op de homepage, of eigen winkelfoto’s als fallback. Profiel-URL voor header, footer en JSON-LD.",
  },
  {
    id: "google",
    section: "integrations",
    title: "Google-reviews",
    navLabel: "Google-reviews",
    intro: "Places API voor live score en citaten op de homepage, of uitgelichte klantquotes zonder API.",
  },
  {
    id: "woocommerce",
    section: "integrations",
    title: "WooCommerce (oude site)",
    navLabel: "WooCommerce",
    intro: "REST-sleutels van bergasports.com. Daarmee kun je producten, klanten, orders, nieuws en pagina’s overnemen.",
  },
  {
    id: "analytics",
    section: "marketing",
    title: "Analytics",
    navLabel: "Analytics",
    intro: "Google Analytics / Tag Manager voor bezoekersstatistieken.",
  },
  {
    id: "pixels",
    section: "marketing",
    title: "Pixels & ads",
    navLabel: "Pixels",
    intro: "Meta, TikTok, Google Ads en Merchant Center.",
  },
  {
    id: "seo",
    section: "marketing",
    title: "SEO & vindbaarheid",
    navLabel: "SEO",
    intro: "Verificatiecodes voor Google Search Console en Bing Webmaster Tools.",
  },
];

export const SITE_SETTING_DEFS: SiteSettingDef[] = [
  {
    key: "MOLLIE_API_KEY",
    envKey: "MOLLIE_API_KEY",
    label: "Mollie API-key",
    group: "payments",
    secret: true,
    placeholder: "live_… of test_…",
    manual: {
      summary: "Live API-key uit je Mollie-dashboard. Zonder deze key werkt online betalen niet.",
      steps: [
        "Ga naar my.mollie.com en log in met het Bergasports-account.",
        "Open Developers → API-keys (of Instellingen → API-keys).",
        "Kopieer de Live API-key (begint met live_). Gebruik test_ alleen om te oefenen.",
        "Plak de key hieronder en klik Opslaan.",
        "Controleer daarna een testbestelling in de checkout (of een klein live-bedrag).",
      ],
      links: [
        { label: "Mollie dashboard", href: "https://my.mollie.com/" },
        { label: "API-keys hulp", href: "https://docs.mollie.com/docs/authentication" },
      ],
      whereUsed: "Checkout, webhook `/api/mollie/webhook`, live betaalmethodes via `/api/mollie/methods`.",
    },
  },
  {
    key: "MOLLIE_PROFILE_ID",
    envKey: "MOLLIE_PROFILE_ID",
    label: "Mollie Profile ID",
    group: "payments",
    secret: false,
    optional: true,
    placeholder: "pfl_…",
    manual: {
      summary: "Optioneel. Koppelt betalingen aan het juiste webshop-profiel in Mollie.",
      steps: [
        "In Mollie: Settings → Website profiles (Websiteprofielen).",
        "Open het profiel voor Bergasports / nieuw.bergasports.com.",
        "Kopieer het Profile ID (begint met pfl_).",
        "Plak hier en sla op.",
      ],
      links: [{ label: "Website profiles", href: "https://my.mollie.com/dashboard/settings/profiles" }],
      whereUsed: "Bij het aanmaken van Mollie-betalingen.",
    },
  },
  {
    key: "SENDCLOUD_PUBLIC_KEY",
    envKey: "SENDCLOUD_PUBLIC_KEY",
    label: "Sendcloud Public Key",
    group: "shipping",
    secret: true,
    optional: true,
    placeholder: "public key uit Sendcloud",
    manual: {
      summary: "Publieke API-key van Sendcloud. Samen met de secret key nodig voor labels en tracking.",
      steps: [
        "Log in op panel.sendcloud.sc met het Bergasports-account.",
        "Ga naar Settings → Integrations → API.",
        "Kopieer de Public Key.",
        "Plak hier en sla op, samen met de Secret Key.",
      ],
      links: [{ label: "Sendcloud panel", href: "https://panel.sendcloud.sc/" }],
      whereUsed: "Orderdetail → Sendcloud: label & verzenden.",
    },
  },
  {
    key: "SENDCLOUD_SECRET_KEY",
    envKey: "SENDCLOUD_SECRET_KEY",
    label: "Sendcloud Secret Key",
    group: "shipping",
    secret: true,
    optional: true,
    placeholder: "secret key uit Sendcloud",
    manual: {
      summary: "Geheime API-key van Sendcloud. Zonder deze key kunnen er geen labels worden aangemaakt.",
      steps: [
        "In Sendcloud: Settings → Integrations → API.",
        "Kopieer de Secret Key (één keer zichtbaar of via regenerate).",
        "Plak hier. De waarde blijft na opslaan verborgen.",
      ],
      links: [{ label: "Sendcloud API", href: "https://panel.sendcloud.sc/" }],
      whereUsed: "Aanmaken van parcels en labels via `/api/admin/orders/[id]/sendcloud`.",
    },
  },
  {
    key: "INSTAGRAM_ACCESS_TOKEN",
    envKey: "INSTAGRAM_ACCESS_TOKEN",
    label: "Instagram Access Token",
    group: "instagram",
    secret: true,
    optional: true,
    placeholder: "IGAAxxxx…",
    manual: {
      summary:
        "Optionele long-lived token via Instagram Login (instagram_business_basic). Zonder token toont de homepage eigen winkelfoto’s die naar het profiel linken.",
      steps: [
        "Maak (of gebruik) een Meta Developer-app voor @bergasportsnl.",
        "Voeg Instagram Login toe met het recht instagram_business_basic.",
        "Genereer een User access token en wissel om naar een long-lived token (60 dagen).",
        "Plak de token hier. De shop ververst hem automatisch als de feed-aanvraag faalt.",
      ],
      links: [
        { label: "Meta for Developers", href: "https://developers.facebook.com/" },
        {
          label: "Instagram Login API",
          href: "https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login",
        },
      ],
      whereUsed: "Homepage-feed via GET graph.instagram.com/me/media.",
    },
  },
  {
    key: "INSTAGRAM_USER_ID",
    envKey: "INSTAGRAM_USER_ID",
    label: "Instagram User ID",
    group: "instagram",
    secret: false,
    optional: true,
    placeholder: "17841…",
    manual: {
      summary:
        "Optioneel. De feed gebruikt standaard GET /me/media; dit ID is alleen een fallback als dat mislukt.",
      steps: [
        "Niet verplicht bij Instagram Login.",
        "Eventueel: GET /me?fields=id,username met je token in Graph API Explorer.",
        "Plak alleen het numerieke ID (geen @handle).",
      ],
      links: [
        {
          label: "Graph API Explorer",
          href: "https://developers.facebook.com/tools/explorer/",
        },
      ],
      whereUsed: "Fallback-pad: `/{user-id}/media` als `/me/media` faalt.",
    },
  },
  {
    key: "INSTAGRAM_PUBLIC_URL",
    envKey: "INSTAGRAM_PUBLIC_URL",
    label: "Instagram profiel-URL",
    group: "instagram",
    secret: false,
    optional: true,
    placeholder: "https://www.instagram.com/bergasportsnl/",
    manual: {
      summary: "Publieke link die bezoekers zien bij ‘Volg ons op Instagram’.",
      steps: [
        "Open Instagram → profiel Bergasports.",
        "Kopieer de URL (bijv. https://www.instagram.com/bergasportsnl/).",
        "Plak hier en sla op.",
      ],
      whereUsed: "Header, footer, homepage-CTA’s, JSON-LD sameAs.",
    },
  },
  {
    key: "GOOGLE_PLACES_API_KEY",
    envKey: "GOOGLE_PLACES_API_KEY",
    label: "Google Places API-key",
    group: "google",
    secret: true,
    optional: true,
    placeholder: "AIza…",
    manual: {
      summary:
        "Optioneel. Met deze key haalt de homepage de echte Google-score en recente reviews op (max. 5, gecachet 1 uur).",
      steps: [
        "Open Google Cloud Console met het Bergasports-account.",
        "Maak een project (of gebruik een bestaand) en zet Places API (New) aan — of de klassieke Places API.",
        "Maak een API-key. Beperk hem tot Places API / Places API (New).",
        "Plak de key hier. De waarde blijft na opslaan verborgen.",
        "Vul het Place ID in, of laat leeg: de shop zoekt dan ‘Bergasports Julianastraat 3A Dedemsvaart’.",
        "Klik op deze pagina op ‘Koppeling testen’.",
      ],
      links: [
        { label: "Google Cloud Console", href: "https://console.cloud.google.com/" },
        {
          label: "Places API (New)",
          href: "https://developers.google.com/maps/documentation/places/web-service/op-overview",
        },
      ],
      whereUsed: "Homepage-reviews, contactkaart, LocalBusiness JSON-LD (alleen echte score).",
    },
  },
  {
    key: "GOOGLE_PLACE_ID",
    envKey: "GOOGLE_PLACE_ID",
    label: "Google Place ID",
    group: "google",
    secret: false,
    optional: true,
    placeholder: "ChIJ…",
    manual: {
      summary: "Het Google Place ID van Bergasports in Dedemsvaart. Nodig voor de reviews-URL en de API.",
      steps: [
        "Open de Place ID Finder en zoek op Bergasports, Julianastraat 3A Dedemsvaart.",
        "Kopieer het ID (begint meestal met ChIJ).",
        "Plak hier. Zonder ID probeert de API het adres zelf te vinden.",
      ],
      links: [
        {
          label: "Place ID Finder",
          href: "https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder",
        },
      ],
      whereUsed: "Google-reviewssectie, ‘Bekijk op Google’-link, Places Details.",
    },
  },
  {
    key: "GOOGLE_PLACE_RATING",
    envKey: "GOOGLE_PLACE_RATING",
    label: "Google-score (handmatig)",
    group: "google",
    secret: false,
    optional: true,
    placeholder: "4.9",
    manual: {
      summary:
        "Alleen invullen met het echte cijfer van Google Maps, als de API geen score teruggeeft. Komt in JSON-LD.",
      steps: [
        "Open de Google-profielpagina van de winkel.",
        "Neem het gemiddelde over (bijv. 4,9).",
        "Laat leeg als je de Places API gebruikt of het cijfer niet zeker weet — nooit een verzonnen score.",
      ],
      whereUsed: "Homepage-score en LocalBusiness aggregateRating (alleen als de API niets heeft).",
    },
  },
  {
    key: "GOOGLE_PLACE_RATING_COUNT",
    envKey: "GOOGLE_PLACE_RATING_COUNT",
    label: "Aantal Google-reviews (handmatig)",
    group: "google",
    secret: false,
    optional: true,
    placeholder: "40",
    manual: {
      summary: "Het echte aantal beoordelingen van Google Maps, samen met de handmatige score.",
      steps: [
        "Neem het aantal reviews van de Google-pagina (niet van een andere site).",
        "Vul alleen een geheel getal in.",
        "Laat leeg zonder betrouwbaar cijfer — JSON-LD krijgt dan geen aggregateRating.",
      ],
      whereUsed: "Homepage-score en LocalBusiness aggregateRating.",
    },
  },
  {
    key: "GOOGLE_REVIEWS_FEATURED_JSON",
    envKey: "GOOGLE_REVIEWS_FEATURED_JSON",
    label: "Uitgelichte citaten",
    group: "google",
    secret: false,
    optional: true,
    hidden: true,
    multiline: true,
    manual: {
      summary: "Handmatig gekozen klantcitaten voor als de Places API geen reviewteksten geeft.",
      steps: ["Bewerk de citaten op deze pagina.", "Sla op."],
      whereUsed: "Homepage en contact, gelabeld als ‘klanten over Bergasports’.",
    },
  },
  {
    key: "NEXT_PUBLIC_GA4_ID",
    envKey: "NEXT_PUBLIC_GA4_ID",
    label: "Google Analytics 4 (Measurement ID)",
    group: "analytics",
    secret: false,
    optional: true,
    placeholder: "G-XXXXXXXX",
    manual: {
      summary: "Meet bezoekers en aankopen in Google Analytics 4.",
      steps: [
        "Ga naar analytics.google.com → Beheer → Gegevensstreams.",
        "Open (of maak) de webstream voor Bergasports.",
        "Kopieer de Measurement ID (begint met G-).",
        "Plak hier. Na opslaan verschijnt tracking op de site (kan tot enkele minuten duren).",
      ],
      links: [{ label: "Google Analytics", href: "https://analytics.google.com/" }],
      whereUsed: "Site-wide via AnalyticsScripts (paginaweergaven + commerce events).",
    },
  },
  {
    key: "NEXT_PUBLIC_GTM_ID",
    envKey: "NEXT_PUBLIC_GTM_ID",
    label: "Google Tag Manager ID",
    group: "analytics",
    secret: false,
    optional: true,
    placeholder: "GTM-XXXXXXX",
    manual: {
      summary: "Optioneel. Gebruik GTM als je tags centraal wilt beheren (Ads, pixels, etc.).",
      steps: [
        "Ga naar tagmanager.google.com → container voor Bergasports.",
        "Kopieer het Container ID (begint met GTM-).",
        "Plak hier. Let op: dubbele tracking vermijden als GA4 al via GTM staat.",
      ],
      links: [{ label: "Google Tag Manager", href: "https://tagmanager.google.com/" }],
      whereUsed: "Site-wide GTM container snippet.",
    },
  },
  {
    key: "GOOGLE_SITE_VERIFICATION",
    envKey: "GOOGLE_SITE_VERIFICATION",
    label: "Google Search Console verificatiecode",
    group: "seo",
    secret: false,
    optional: true,
    placeholder: "abc123XYZ-voorbeeldcode",
    manual: {
      summary:
        "Bewijst aan Google dat je eigenaar bent van bergasports.com, zodat je zoekresultaten en de sitemap kunt beheren.",
      steps: [
        "Ga naar search.google.com/search-console en voeg bergasports.com toe als property (type: URL-prefix).",
        "Kies verificatiemethode ‘HTML-tag’.",
        "Kopieer alléén de code uit content=\"...\" — niet de hele tag.",
        "Plak hier en sla op. Klik daarna in Search Console op ‘Verifiëren’.",
        "Dien tot slot de sitemap in: https://www.bergasports.com/sitemap.xml",
      ],
      links: [{ label: "Google Search Console", href: "https://search.google.com/search-console" }],
      whereUsed: "Meta-tag google-site-verification in de <head> van elke pagina.",
    },
  },
  {
    key: "BING_SITE_VERIFICATION",
    envKey: "BING_SITE_VERIFICATION",
    label: "Bing Webmaster verificatiecode",
    group: "seo",
    secret: false,
    optional: true,
    placeholder: "1A2B3C4D5E6F",
    manual: {
      summary: "Optioneel. Zelfde principe als Google, voor Bing en daarmee ook ChatGPT-zoekresultaten.",
      steps: [
        "Ga naar bing.com/webmasters en voeg bergasports.com toe.",
        "Kies ‘HTML Meta Tag’ en kopieer de waarde uit content=\"...\".",
        "Plak hier en sla op.",
      ],
      links: [{ label: "Bing Webmaster Tools", href: "https://www.bing.com/webmasters" }],
      whereUsed: "Meta-tag msvalidate.01 in de <head> van elke pagina.",
    },
  },
  {
    key: "SMTP_HOST",
    envKey: "SMTP_HOST",
    label: "SMTP host",
    group: "email",
    secret: false,
    optional: true,
    placeholder: "smtp.example.com",
    manual: {
      summary: "Mailserver voor orderbevestigingen. Alternatief: alleen Resend API-key.",
      steps: [
        "Vraag SMTP-gegevens op bij je mailprovider (of Microsoft 365 / Google Workspace).",
        "Vul host, poort, gebruiker en wachtwoord in.",
        "Stuur een testorder of vraag Media2Net een testmail te sturen.",
      ],
      whereUsed: "Transactionele mails na bestelling.",
    },
  },
  {
    key: "SMTP_PORT",
    envKey: "SMTP_PORT",
    label: "SMTP poort",
    group: "email",
    secret: false,
    optional: true,
    placeholder: "465",
    manual: {
      summary: "Meestal 465 (SSL) of 587 (STARTTLS).",
      steps: ["Vul 465 of 587 in volgens je provider.", "Laat leeg om standaard 465 te gebruiken."],
      whereUsed: "SMTP-verbinding voor ordermails.",
    },
  },
  {
    key: "SMTP_USER",
    envKey: "SMTP_USER",
    label: "SMTP gebruiker",
    group: "email",
    secret: false,
    optional: true,
    placeholder: "info@bergasports.com",
    manual: {
      summary: "Inlognaam voor de mailbox die mails verstuurt.",
      steps: ["Meestal het volledige e-mailadres van de verzendmailbox."],
      whereUsed: "SMTP-auth.",
    },
  },
  {
    key: "SMTP_PASS",
    envKey: "SMTP_PASS",
    label: "SMTP wachtwoord",
    group: "email",
    secret: true,
    optional: true,
    placeholder: "••••••••",
    manual: {
      summary: "Wachtwoord of app-wachtwoord van de SMTP-mailbox.",
      steps: [
        "Gebruik bij voorkeur een app-wachtwoord (Google/Microsoft) i.p.v. je normale login.",
        "Plak hier; de waarde blijft verborgen na opslaan.",
      ],
      whereUsed: "SMTP-auth (samen met SMTP_USER).",
    },
  },
  {
    key: "SMTP_FROM",
    envKey: "SMTP_FROM",
    label: "Afzender (From)",
    group: "email",
    secret: false,
    optional: true,
    placeholder: "Bergasports <info@bergasports.com>",
    manual: {
      summary: "Naam + adres die klanten zien als afzender.",
      steps: [
        "Voorbeeld: Bergasports <info@bergasports.com>",
        "Moet een adres zijn dat je provider mag versturen.",
      ],
      whereUsed: "From-header van ordermails.",
    },
  },
  {
    key: "RESEND_API_KEY",
    envKey: "RESEND_API_KEY",
    label: "Resend API-key",
    group: "email",
    secret: true,
    optional: true,
    placeholder: "re_…",
    manual: {
      summary: "Alternatief voor SMTP. Als Resend gezet is, kan dat als mailprovider dienen.",
      steps: [
        "Account op resend.com → API Keys → Create.",
        "Verifieer het verzenddomein bergasports.com.",
        "Plak de key hier (begint met re_).",
      ],
      links: [{ label: "Resend dashboard", href: "https://resend.com/api-keys" }],
      whereUsed: "Ordermails (als SMTP niet volledig is geconfigureerd).",
    },
  },
  {
    key: "WC_STORE_BASE_URL",
    envKey: "WC_STORE_BASE_URL",
    label: "WooCommerce basis-URL",
    group: "woocommerce",
    secret: false,
    optional: true,
    placeholder: "https://www.bergasports.com",
    manual: {
      summary: "URL van de oude WordPress/WooCommerce-shop voor sync.",
      steps: [
        "Meestal https://www.bergasports.com (zonder trailing slash).",
        "Alleen wijzigen als de oude site op een ander domein draait.",
      ],
      whereUsed: "WordPress-import, order-sync en catalogus-scripts.",
    },
  },
  {
    key: "WC_CONSUMER_KEY",
    envKey: "WC_CONSUMER_KEY",
    label: "WooCommerce Consumer Key",
    group: "woocommerce",
    secret: true,
    optional: true,
    placeholder: "ck_…",
    manual: {
      summary: "REST API-key vanaf de oude WooCommerce-site.",
      steps: [
        "Log in op WordPress admin van bergasports.com.",
        "WooCommerce → Instellingen → Geavanceerd → REST API → Sleutel toevoegen.",
        "Rechten: Lezen (of Lezen/Schrijven als sync dat nodig heeft).",
        "Kopieer de Consumer Key (ck_…) en secret (cs_…).",
      ],
      whereUsed: "Admin WooCommerce-import, order-sync en `npm run import:wordpress`.",
    },
  },
  {
    key: "WC_CONSUMER_SECRET",
    envKey: "WC_CONSUMER_SECRET",
    label: "WooCommerce Consumer Secret",
    group: "woocommerce",
    secret: true,
    optional: true,
    placeholder: "cs_…",
    manual: {
      summary: "Hoort bij de Consumer Key hierboven.",
      steps: [
        "Wordt één keer getoond bij het aanmaken van de REST API-sleutel in WooCommerce.",
        "Kwijtgeraakt? Maak een nieuwe sleutel aan en vervang key + secret hier.",
      ],
      whereUsed: "Samen met Consumer Key voor WooCommerce REST (producten, klanten, orders).",
    },
  },
  {
    key: "NEXT_PUBLIC_SITE_URL",
    envKey: "NEXT_PUBLIC_SITE_URL",
    label: "Shop basis-URL",
    group: "shop",
    secret: false,
    optional: true,
    placeholder: "https://nieuw.bergasports.com",
    manual: {
      summary: "Canonieke URL van deze nieuwe shop (zonder slash aan het eind).",
      steps: [
        "Productie: https://nieuw.bergasports.com of later https://www.bergasports.nl",
        "Wijzig dit alleen in overleg met Media2Net — beïnvloedt e-maillinks en Mollie redirects.",
      ],
      whereUsed: "E-mails, sitemap, Mollie redirect/webhook-bases.",
    },
  },
  {
    key: "NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_EUR",
    envKey: "NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_EUR",
    label: "Gratis verzending vanaf (€)",
    group: "shop",
    secret: false,
    optional: true,
    placeholder: "150",
    manual: {
      summary: "Vanaf dit bedrag (euro) is standaard verzending naar Nederland gratis. Leeg = 150 euro.",
      steps: [
        "Vul een bedrag in, bijvoorbeeld 150.",
        "Sla op. Productpagina’s, winkelwagen en checkout gebruiken dezelfde drempel.",
        "Afhalen in Dedemsvaart blijft altijd gratis. Andere landen alleen bij een eigen ‘gratis vanaf’ op het verzendtarief.",
      ],
      whereUsed: "Productpagina, winkelwagen, checkout-verzendkosten en /verzending.",
    },
  },
  {
    key: "LOW_STOCK_THRESHOLD",
    envKey: "LOW_STOCK_THRESHOLD",
    label: "Bijna uitverkocht vanaf (stuks)",
    group: "products",
    secret: false,
    optional: true,
    placeholder: "3",
    manual: {
      summary: "Producten met dit aantal of minder krijgen in het CMS de status ‘bijna uitverkocht’.",
      steps: ["Standaard is 3. Verhoog of verlaag naar wens.", "Sla op. Dashboard en voorraadlijst gebruiken de nieuwe drempel."],
      whereUsed: "Dashboard, voorraadbeheer.",
    },
  },
  {
    key: "SHOP_PHONE",
    envKey: "SHOP_PHONE",
    label: "Telefoonnummer",
    group: "store",
    secret: false,
    optional: true,
    placeholder: "06 - 8316 2631",
    manual: {
      summary: "Publieke telefoon zoals in de footer, contactpagina en afspraak-CTA.",
      steps: ["Vul het nummer in zoals klanten het moeten zien.", "Sla op."],
      whereUsed: "Footer, contact, homepage, factuur.",
    },
  },
  {
    key: "SHOP_EMAIL",
    envKey: "SHOP_EMAIL",
    label: "Publiek e-mailadres",
    group: "store",
    secret: false,
    optional: true,
    placeholder: "info@bergasports.com",
    manual: {
      summary: "Het adres dat klanten gebruiken om de winkel te mailen (niet per se de SMTP-mailbox).",
      steps: ["Meestal info@bergasports.com.", "Sla op."],
      whereUsed: "Footer, contact, JSON-LD.",
    },
  },
  {
    key: "SHOP_ADDRESS",
    envKey: "SHOP_ADDRESS",
    label: "Adres",
    group: "store",
    secret: false,
    optional: true,
    multiline: true,
    placeholder: "Julianastraat 3A, 7701 GH Dedemsvaart, Nederland",
    manual: {
      summary: "Fysiek winkeladres voor footer en contact.",
      steps: ["Eén regel is genoeg.", "Sla op."],
      whereUsed: "Footer, homepage, factuur.",
    },
  },
  {
    key: "SHOP_KVK",
    envKey: "SHOP_KVK",
    label: "KvK-nummer",
    group: "store",
    secret: false,
    optional: true,
    placeholder: "52087018",
    manual: {
      summary: "Kamer van Koophandel-nummer in de footer.",
      steps: ["Vul het KvK-nummer in zonder spaties.", "Sla op."],
      whereUsed: "Footer en structured data.",
    },
  },
  {
    key: "WHATSAPP_NUMBER",
    envKey: "WHATSAPP_NUMBER",
    label: "WhatsApp-nummer",
    group: "store",
    secret: false,
    optional: true,
    placeholder: "06 8316 2631",
    manual: {
      summary: "Nummer waarop klanten via WhatsApp kunnen chatten. Verschijnt in de footer.",
      steps: [
        "Vul het mobiele nummer in, bijvoorbeeld 06 8316 2631 of +31683162631.",
        "Sla op. De footer toont daarna een WhatsApp-link.",
      ],
      whereUsed: "Footer en eventuele contact-CTA’s.",
    },
  },
  {
    key: "SHOP_VAT_NUMBER",
    envKey: "SHOP_VAT_NUMBER",
    label: "BTW-nummer",
    group: "store",
    secret: false,
    optional: true,
    placeholder: "NL123456789B01",
    manual: {
      summary: "BTW-identificatienummer van de winkel, zichtbaar in de footer.",
      steps: ["Vul het nummer in zoals op de KvK-inschrijving.", "Sla op."],
      whereUsed: "Footer en factuurgegevens.",
    },
  },
  {
    key: "SHOP_OPENING_HOURS_SHORT",
    envKey: "SHOP_OPENING_HOURS_SHORT",
    label: "Openingstijden (kort)",
    group: "store",
    secret: false,
    optional: true,
    placeholder: "Di t/m vr 12:30 – 17:30 · do tot 21:00 · za 12:00 – 16:00",
    multiline: true,
    manual: {
      summary: "Eénregelige samenvatting van de openingstijden op product- en contactpagina’s.",
      steps: ["Houd het kort, bijvoorbeeld zoals in de placeholder.", "Sla op."],
      whereUsed: "Productpromo, contact en overige winkelcopy.",
    },
  },
  {
    key: "SHOP_OPENING_HOURS_JSON",
    envKey: "SHOP_OPENING_HOURS_JSON",
    label: "Openingstijden (tabel)",
    group: "store",
    secret: false,
    optional: true,
    hidden: true,
    multiline: true,
    manual: {
      summary: "Volledige openingstijden per dag, zichtbaar in footer, homepage en Google-gegevens.",
      steps: ["Bewerk de tabel op deze pagina.", "Sla op."],
      whereUsed: "Footer, homepage, structured data.",
    },
  },
  {
    key: "SMTP_SECURE",
    envKey: "SMTP_SECURE",
    label: "SMTP SSL/TLS",
    group: "email",
    secret: false,
    optional: true,
    placeholder: "true of false",
    manual: {
      summary: "true = SSL (poort 465). false = STARTTLS (poort 587). Leeg = automatisch op basis van de poort.",
      steps: ["Laat leeg tenzij je provider iets anders voorschrijft.", "Sla op."],
      whereUsed: "SMTP-verbinding.",
    },
  },
  {
    key: "ORDER_NOTIFICATION_EMAIL",
    envKey: "ORDER_NOTIFICATION_EMAIL",
    label: "Nieuwe order naar",
    group: "notifications",
    secret: false,
    optional: true,
    placeholder: "info@bergasports.com",
    manual: {
      summary: "Intern adres dat een mail krijgt bij elke nieuwe bestelling.",
      steps: ["Vul één e-mailadres in.", "Sla op. Test daarna met een bestelling."],
      whereUsed: "Interne ordernotificatie.",
    },
  },
  {
    key: "ORDER_NOTIFICATION_FROM",
    envKey: "ORDER_NOTIFICATION_FROM",
    label: "Afzender (Resend / fallback)",
    group: "notifications",
    secret: false,
    optional: true,
    placeholder: "Bergasports <info@bergasports.com>",
    manual: {
      summary: "Wordt gebruikt als Resend verstuurt, of als SMTP_FROM leeg is.",
      steps: ["Zelfde formaat als SMTP From.", "Sla op."],
      whereUsed: "From-header bij Resend en als SMTP-fallback.",
    },
  },
  {
    key: "NEXT_PUBLIC_EMAIL_LOGO_URL",
    envKey: "NEXT_PUBLIC_EMAIL_LOGO_URL",
    label: "Logo in e-mails (URL)",
    group: "notifications",
    secret: false,
    optional: true,
    placeholder: "https://www.bergasports.com/bergasports-logo.png",
    manual: {
      summary: "Optionele absolute URL van het logo in ordermails. Leeg = standaard Bergasports-logo.",
      steps: ["Plak een https-URL naar een PNG/JPG.", "Sla op en stuur een testmail."],
      whereUsed: "Transactionele e-mails.",
    },
  },
  {
    key: "MARKETING_WINBACK_CODE",
    envKey: "MARKETING_WINBACK_CODE",
    label: "Win-back kortingscode",
    group: "notifications",
    secret: false,
    optional: true,
    placeholder: "TERUG10",
    manual: {
      summary: "Code in de win-backmail naar klanten die lang niet bestelden.",
      steps: ["Kies een code die ook in de shop werkt, of laat TERUG10 staan.", "Sla op."],
      whereUsed: "Win-backcron en marketingmails.",
    },
  },
  {
    key: "MARKETING_WINBACK_EXPIRY_DAYS",
    envKey: "MARKETING_WINBACK_EXPIRY_DAYS",
    label: "Win-back geldig (dagen)",
    group: "notifications",
    secret: false,
    optional: true,
    placeholder: "14",
    manual: {
      summary: "Hoeveel dagen de win-backcode in de mail geldig is.",
      steps: ["Standaard 14.", "Sla op."],
      whereUsed: "Tekst in de win-backmail.",
    },
  },
  {
    key: "REPEAT_ORDER_DISCOUNT_PERCENT",
    envKey: "REPEAT_ORDER_DISCOUNT_PERCENT",
    label: "Herhaalbestelling korting (%)",
    group: "notifications",
    secret: false,
    optional: true,
    placeholder: "10",
    manual: {
      summary: "Korting voor terugkerende kopers (max. 30%).",
      steps: ["Bijvoorbeeld 10.", "Sla op."],
      whereUsed: "Checkout voor bestaande klanten.",
    },
  },
  {
    key: "REPEAT_ORDER_PROMO_CODE",
    envKey: "REPEAT_ORDER_PROMO_CODE",
    label: "Herhaalbestelling code",
    group: "notifications",
    secret: false,
    optional: true,
    placeholder: "CLIENT10",
    manual: {
      summary: "Promocode-naam die bij de herhaalkorting hoort.",
      steps: ["Laat CLIENT10 staan of kies een eigen code.", "Sla op."],
      whereUsed: "Checkout / marketingstatus.",
    },
  },
  {
    key: "EASY_SALES_API_TOKEN",
    envKey: "EASY_SALES_API_TOKEN",
    label: "Easy Sales API-token",
    group: "easysales",
    secret: true,
    optional: true,
    placeholder: "personal access token",
    manual: {
      summary: "Personal Access Token uit Easy Sales. Nodig voor voorraad- en ordersync.",
      steps: [
        "Log in op Easy Sales → API Settings.",
        "Maak of kopieer een Personal Access Token.",
        "Plak hier samen met de website-token.",
      ],
      whereUsed: "Voorraadsync, orderpush, Easy Sales-status in de sidebar.",
    },
  },
  {
    key: "EASY_SALES_WEBSITE_TOKEN",
    envKey: "EASY_SALES_WEBSITE_TOKEN",
    label: "Easy Sales website-token",
    group: "easysales",
    secret: true,
    optional: true,
    placeholder: "website token",
    manual: {
      summary: "Website-token van de Bergasports-shop in Easy Sales.",
      steps: ["In Easy Sales bij de website-koppeling.", "Plak hier."],
      whereUsed: "Orders en voorraad naar de juiste webshop.",
    },
  },
  {
    key: "EASY_SALES_API_BASE_URL",
    envKey: "EASY_SALES_API_BASE_URL",
    label: "Easy Sales API-URL",
    group: "easysales",
    secret: false,
    optional: true,
    placeholder: "https://easy-sales.com/api/v2",
    manual: {
      summary: "Laat de standaard staan tenzij Easy Sales een andere host opgeeft.",
      steps: ["Meestal https://easy-sales.com/api/v2", "Sla op."],
      whereUsed: "Easy Sales HTTP-calls.",
    },
  },
  {
    key: "EASY_SALES_CLIENT_ID",
    envKey: "EASY_SALES_CLIENT_ID",
    label: "Easy Sales Client ID",
    group: "easysales",
    secret: false,
    optional: true,
    placeholder: "optioneel",
    manual: {
      summary: "Optioneel, alleen nodig voor website-grant in plaats van personal token.",
      steps: ["Vul in als Easy Sales dit voorschrijft.", "Sla op samen met Client Secret."],
      whereUsed: "OAuth/website grant.",
    },
  },
  {
    key: "EASY_SALES_CLIENT_SECRET",
    envKey: "EASY_SALES_CLIENT_SECRET",
    label: "Easy Sales Client Secret",
    group: "easysales",
    secret: true,
    optional: true,
    placeholder: "optioneel",
    manual: {
      summary: "Hoort bij Client ID. Leeg laten als je een Personal Access Token gebruikt.",
      steps: ["Plak het secret.", "Sla op."],
      whereUsed: "OAuth/website grant.",
    },
  },
  {
    key: "NEXT_PUBLIC_META_PIXEL_ID",
    envKey: "NEXT_PUBLIC_META_PIXEL_ID",
    label: "Meta Pixel ID",
    group: "pixels",
    secret: false,
    optional: true,
    placeholder: "1234567890",
    manual: {
      summary: "Facebook/Instagram-pixel voor advertenties.",
      steps: ["In Meta Events Manager → Data sources → Pixel ID kopiëren.", "Plak hier."],
      whereUsed: "Marketingpixels op de shop (na cookie-toestemming).",
    },
  },
  {
    key: "NEXT_PUBLIC_GOOGLE_ADS_ID",
    envKey: "NEXT_PUBLIC_GOOGLE_ADS_ID",
    label: "Google Ads ID",
    group: "pixels",
    secret: false,
    optional: true,
    placeholder: "AW-XXXXXXXX",
    manual: {
      summary: "Conversietag voor Google Ads.",
      steps: ["In Google Ads → Tools → Conversies.", "Kopieer het AW-nummer."],
      whereUsed: "Advertentieconversies.",
    },
  },
  {
    key: "NEXT_PUBLIC_TIKTOK_PIXEL_ID",
    envKey: "NEXT_PUBLIC_TIKTOK_PIXEL_ID",
    label: "TikTok Pixel ID",
    group: "pixels",
    secret: false,
    optional: true,
    placeholder: "CXXXXXXXX",
    manual: {
      summary: "TikTok-pixel voor events zoals ViewContent en Purchase.",
      steps: ["TikTok Ads Manager → Assets → Events.", "Kopieer het Pixel ID."],
      whereUsed: "TikTok-events op de shop.",
    },
  },
  {
    key: "TIKTOK_EVENTS_API_ACCESS_TOKEN",
    envKey: "TIKTOK_EVENTS_API_ACCESS_TOKEN",
    label: "TikTok Events API-token",
    group: "pixels",
    secret: true,
    optional: true,
    placeholder: "server-side token",
    manual: {
      summary: "Optionele server-side Events API naast de browserpixel.",
      steps: ["In TikTok Events Manager → Events API.", "Plak het access token."],
      whereUsed: "Server-side TikTok events.",
    },
  },
  {
    key: "GOOGLE_MERCHANT_CENTER_ID",
    envKey: "GOOGLE_MERCHANT_CENTER_ID",
    label: "Google Merchant Center ID",
    group: "pixels",
    secret: false,
    optional: true,
    placeholder: "123456789",
    manual: {
      summary: "ID van het Merchant Center-account voor productfeeds.",
      steps: ["In merchants.google.com linksboven het nummer.", "Plak hier."],
      whereUsed: "Marketingstatus / Shopping-feed.",
    },
  },
];

export function getSettingDef(key: string): SiteSettingDef | undefined {
  return SITE_SETTING_DEFS.find((d) => d.key === key);
}

export function getSettingGroup(id: string) {
  return SITE_SETTING_GROUPS.find((g) => g.id === id);
}

export function isSettingGroupId(id: string): id is SiteSettingGroupId {
  return SITE_SETTING_GROUPS.some((g) => g.id === id);
}

export function maskSecretValue(value: string): string {
  const t = value.trim();
  if (!t) return "";
  if (t.length <= 8) return "••••••••";
  return `${"•".repeat(8)}${t.slice(-4)}`;
}

export type AdminSettingFieldView = {
  key: string;
  label: string;
  group: SiteSettingDef["group"];
  secret: boolean;
  optional: boolean;
  placeholder?: string;
  configured: boolean;
  source: "database" | "env" | "missing";
  /** Voor geheimen: leeg of mask. Voor publiek: de echte waarde. */
  displayValue: string;
  multiline?: boolean;
  hidden?: boolean;
  manual: SiteSettingDef["manual"];
};
