/**
 * Catalogus van admin-bewerkbare integratiekeys + handleidingen voor Ingmar.
 * Waarden: site_settings (DB) overschrijft process.env.
 */

export type SiteSettingGroupId =
  | "payments"
  | "instagram"
  | "analytics"
  | "email"
  | "woocommerce"
  | "shop";

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
  manual: {
    summary: string;
    steps: string[];
    links?: { label: string; href: string }[];
    whereUsed: string;
  };
};

export const SITE_SETTING_GROUPS: {
  id: SiteSettingGroupId;
  title: string;
  intro: string;
}[] = [
  {
    id: "payments",
    title: "Betalingen (Mollie)",
    intro: "Nodig voor iDEAL, kaarten en overige betaalmethodes in de checkout.",
  },
  {
    id: "instagram",
    title: "Instagram",
    intro: "Feed op de homepage + link naar jullie profiel.",
  },
  {
    id: "analytics",
    title: "Analytics",
    intro: "Google Analytics / Tag Manager voor bezoekersstatistieken.",
  },
  {
    id: "email",
    title: "E-mail (ordermails)",
    intro: "SMTP of Resend voor bestelbevestigingen naar klant en winkel.",
  },
  {
    id: "woocommerce",
    title: "WooCommerce (oude site)",
    intro: "Alleen voor synchronisatie van orders/catalogus vanaf bergasports.com.",
  },
  {
    id: "shop",
    title: "Shop",
    intro: "Basis-URL van de webshop (voor links in e-mails en redirects).",
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
      whereUsed: "Checkout, webhook `/api/mollie/webhook`, betaalmethodes-lijst.",
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
    key: "INSTAGRAM_ACCESS_TOKEN",
    envKey: "INSTAGRAM_ACCESS_TOKEN",
    label: "Instagram Access Token",
    group: "instagram",
    secret: true,
    optional: true,
    placeholder: "IGAAxxxx…",
    manual: {
      summary:
        "Lange-levensduur token voor de Instagram Basic Display / Graph API, zodat recente posts op de homepage verschijnen.",
      steps: [
        "Maak (of gebruik) een Meta Developer-app gekoppeld aan @bergasports.",
        "Voeg Instagram Basic Display of Instagram Graph API toe.",
        "Genereer een User access token voor het Instagram Business/Creator-account.",
        "Wissel om naar een long-lived token (60 dagen) via Meta’s token-exchange.",
        "Plak de token hier. Vernieuw hem vóór hij verloopt (anders zie je weer placeholders).",
      ],
      links: [
        { label: "Meta for Developers", href: "https://developers.facebook.com/" },
        {
          label: "Instagram Graph API",
          href: "https://developers.facebook.com/docs/instagram-api/",
        },
      ],
      whereUsed: "Homepage Instagram-sectie (echte foto’s i.p.v. placeholders).",
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
      summary: "Numerieke Instagram-user-id die bij het access token hoort.",
      steps: [
        "In Meta Graph API Explorer: GET /me?fields=id,username met je token.",
        "Of via Instagram Graph: GET /{ig-user-id} na koppeling van de Facebook Page.",
        "Plak alleen het numerieke ID (geen @handle).",
      ],
      links: [
        {
          label: "Graph API Explorer",
          href: "https://developers.facebook.com/tools/explorer/",
        },
      ],
      whereUsed: "Ophalen van media: `/{user-id}/media`.",
    },
  },
  {
    key: "INSTAGRAM_PUBLIC_URL",
    envKey: "INSTAGRAM_PUBLIC_URL",
    label: "Instagram profiel-URL",
    group: "instagram",
    secret: false,
    optional: true,
    placeholder: "https://www.instagram.com/bergasports/",
    manual: {
      summary: "Publieke link die bezoekers zien bij ‘Volg ons op Instagram’.",
      steps: [
        "Open Instagram → profiel Bergasports.",
        "Kopieer de URL (bijv. https://www.instagram.com/bergasports/).",
        "Plak hier en sla op.",
      ],
      whereUsed: "Header, footer, homepage CTA’s.",
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
      whereUsed: "Order-sync en catalogus-import scripts/API.",
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
      whereUsed: "Admin-knop ‘Sync WooCommerce-orders’ en importscripts.",
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
      whereUsed: "Samen met Consumer Key voor WooCommerce REST.",
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
];

export function getSettingDef(key: string): SiteSettingDef | undefined {
  return SITE_SETTING_DEFS.find((d) => d.key === key);
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
  manual: SiteSettingDef["manual"];
};
