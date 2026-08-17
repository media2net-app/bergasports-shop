import type { Metadata, Viewport } from "next";
import { Ubuntu } from "next/font/google";
import { CartProvider } from "@/components/cart/CartProvider";
import CookieConsentBanner from "@/components/cookie/CookieConsentBanner";
import { CookieConsentProvider } from "@/components/cookie/CookieConsentProvider";
import ShopAnalyticsShell from "@/components/cookie/ShopAnalyticsShell";
import AnalyticsScripts from "@/components/analytics/AnalyticsScripts";
import CategoriesProviderRoot from "@/components/categories/CategoriesProviderRoot";
import { ProductLookupProvider } from "@/components/cart/ProductLookupProvider";
import {
  SITE_BRAND_NAME,
  SITE_DEFAULT_URL,
  SITE_LOGO_SRC,
  SITE_TAGLINE,
} from "@/lib/site-brand";
import { SITE_META_DESCRIPTION } from "@/lib/site-content";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import { getRuntimeSetting } from "@/lib/site-settings-db";
import { getFreeShippingThresholdSetting } from "@/lib/shop-runtime";
import "./globals.css";

const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  adjustFontFallback: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1a1a1a",
};

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_DEFAULT_URL),
  title: {
    default: `${SITE_BRAND_NAME}: Fietsenwinkel Orbea | Colnago | Basso | Cervelo | Nimbl`,
    template: `%s | ${SITE_BRAND_NAME}`,
  },
  description: SITE_META_DESCRIPTION,
  icons: {
    icon: SITE_LOGO_SRC,
    apple: SITE_LOGO_SRC,
  },
  openGraph: {
    type: "website",
    siteName: SITE_BRAND_NAME,
    locale: "nl_NL",
    title: SITE_TAGLINE,
    description: SITE_META_DESCRIPTION,
    url: "/",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_BRAND_NAME,
    description: SITE_META_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

/**
 * Verificatiecodes komen uit de admin-instellingen (met env als fallback),
 * zodat Search Console gekoppeld kan worden zonder deploy.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [google, bing] = await Promise.all([
    getRuntimeSetting("GOOGLE_SITE_VERIFICATION"),
    getRuntimeSetting("BING_SITE_VERIFICATION"),
  ]);

  return {
    ...baseMetadata,
    ...(google?.trim() ? { verification: { google: google.trim() } } : {}),
    ...(bing?.trim() ? { other: { "msvalidate.01": bing.trim() } } : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [ga4, gtm, metaPixel, googleAds, tiktokPixel, freeShippingThreshold] = await Promise.all([
    getRuntimeSetting("NEXT_PUBLIC_GA4_ID"),
    getRuntimeSetting("NEXT_PUBLIC_GTM_ID"),
    getRuntimeSetting("NEXT_PUBLIC_META_PIXEL_ID"),
    getRuntimeSetting("NEXT_PUBLIC_GOOGLE_ADS_ID"),
    getRuntimeSetting("NEXT_PUBLIC_TIKTOK_PIXEL_ID"),
    getFreeShippingThresholdSetting().catch(() => 50),
  ]);

  return (
    <html
      lang="nl"
      className={`${ubuntu.variable} h-full font-sans antialiased`}
    >
      <head />
      <body className="min-h-full flex flex-col">
        <AnalyticsScripts ga4={ga4} gtm={gtm} />
        <CookieConsentProvider>
          <CategoriesProviderRoot>
            <ProductLookupProvider>
              <CartProvider freeShippingThreshold={freeShippingThreshold}>
                <ShopAnalyticsShell
                  tiktokPixelId={tiktokPixel}
                  metaPixelId={metaPixel}
                  googleAdsId={googleAds}
                >
                  {children}
                </ShopAnalyticsShell>
                <CookieConsentBanner />
              </CartProvider>
            </ProductLookupProvider>
          </CategoriesProviderRoot>
        </CookieConsentProvider>
      </body>
    </html>
  );
}
