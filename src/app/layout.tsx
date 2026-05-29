import type { Metadata, Viewport } from "next";
import { Ubuntu } from "next/font/google";
import { CartProvider } from "@/components/cart/CartProvider";
import CookieConsentBanner from "@/components/cookie/CookieConsentBanner";
import { CookieConsentProvider } from "@/components/cookie/CookieConsentProvider";
import ShopAnalyticsShell from "@/components/cookie/ShopAnalyticsShell";
import CategoriesProviderRoot from "@/components/categories/CategoriesProviderRoot";
import { ProductLookupProvider } from "@/components/cart/ProductLookupProvider";
import {
  SITE_BRAND_NAME,
  SITE_DEFAULT_URL,
  SITE_LOGO_SRC,
  SITE_TAGLINE,
} from "@/lib/site-brand";
import { SITE_META_DESCRIPTION } from "@/lib/site-content";
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

export const metadata: Metadata = {
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${ubuntu.variable} h-full font-sans antialiased`}
    >
      <head />
      <body className="min-h-full flex flex-col">
        <CookieConsentProvider>
          <CategoriesProviderRoot>
            <ProductLookupProvider>
              <CartProvider>
                <ShopAnalyticsShell>{children}</ShopAnalyticsShell>
                <CookieConsentBanner />
              </CartProvider>
            </ProductLookupProvider>
          </CategoriesProviderRoot>
        </CookieConsentProvider>
      </body>
    </html>
  );
}
