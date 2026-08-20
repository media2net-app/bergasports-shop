import type { Metadata } from "next";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ContentPageLayout from "@/components/site/ContentPageLayout";
import { CONTENT_PHOTOS } from "@/lib/content-photos";
import { getRequestLocale } from "@/lib/i18n/locale";
import { toUiLocale } from "@/lib/i18n/ui";
import { formatProductPrice } from "@/lib/products";
import { buildPageMetadata } from "@/lib/seo";
import { DEFAULT_FREE_SHIPPING_THRESHOLD_EUR } from "@/lib/shop-delivery-trust";
import { getFreeShippingThresholdSetting } from "@/lib/shop-runtime";
import { listActiveShippingRates } from "@/lib/shipping-rates-db";

export const dynamic = "force-dynamic";

function shippingBodyNl(thresholdLabel: string, nlRateLabel: string): string {
  return `
<p>Bestellingen gaan via onze webshop naar je huis, of je haalt ze gratis af in Dedemsvaart. Grote zendingen en complete fietsen overleggen we altijd even.</p>
<h2>Nederland</h2>
<p><strong>Standaard verzending</strong> ${nlRateLabel}. <strong>Gratis verzending</strong> naar Nederland vanaf ${thresholdLabel}, op basis van het te betalen productbedrag (na korting). Afhalen in Dedemsvaart is altijd gratis.</p>
<h2>België, Duitsland en de EU</h2>
<p>Tarieven worden in de checkout getoond op basis van land. Gratis verzending geldt daar alleen als dat bij het tarief is ingesteld.</p>
<h2>Afhalen in Dedemsvaart</h2>
<p><strong>Gratis afhalen</strong> op afspraak aan de Julianastraat 3A. Handig als je tóch langs wilt voor advies of een pasbeurt.</p>
<p>Levertijden zijn indicatief en afhankelijk van voorraad en verzenddienst. Track &amp; trace volgt per e-mail.</p>
<p class="cms-cta-row">
  <a class="cms-cta cms-cta-primary" href="/contact">Vragen over verzending?</a>
  <a class="cms-cta" href="/afspraak#formulier">Plan afhaalafspraak</a>
</p>
`;
}

function shippingBodyEn(thresholdLabel: string, nlRateLabel: string): string {
  return `
<p>Orders ship from our webshop to your door, or you can pick them up free in Dedemsvaart. For large shipments and complete bikes we always check with you first.</p>
<h2>Netherlands</h2>
<p><strong>Standard shipping</strong> ${nlRateLabel}. <strong>Free shipping</strong> to the Netherlands from ${thresholdLabel}, based on the payable product total (after discount). Pickup in Dedemsvaart is always free.</p>
<h2>Belgium, Germany and the EU</h2>
<p>Rates are shown at checkout based on country. Free shipping applies there only when configured for that rate.</p>
<h2>Pickup in Dedemsvaart</h2>
<p><strong>Free pickup</strong> by appointment at Julianastraat 3A. Handy if you want advice or a fitting at the same time.</p>
<p>Delivery times are indicative and depend on stock and the carrier. Track &amp; trace follows by email.</p>
<p class="cms-cta-row">
  <a class="cms-cta cms-cta-primary" href="/contact">Questions about shipping?</a>
  <a class="cms-cta" href="/afspraak#formulier">Book a pickup appointment</a>
</p>
`;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const en = toUiLocale(locale) === "en";
  return buildPageMetadata({
    title: en ? "Shipping & delivery" : "Verzenden & bezorgen",
    description: en
      ? "Shipping costs, delivery times and pickup at Bergasports in Dedemsvaart."
      : "Verzendkosten, levertijden en afhalen bij Bergasports in Dedemsvaart.",
    path: "/verzending",
  });
}

export default async function VerzendingPage() {
  const [threshold, rates, locale] = await Promise.all([
    getFreeShippingThresholdSetting().catch(() => DEFAULT_FREE_SHIPPING_THRESHOLD_EUR),
    listActiveShippingRates().catch(() => []),
    getRequestLocale(),
  ]);
  const en = toUiLocale(locale) === "en";
  const nlStandard = rates.find((rate) => rate.countryCode === "NL" && rate.method === "standard");
  const thresholdLabel = formatProductPrice(threshold, "EUR");
  const nlRateLabel =
    nlStandard && nlStandard.price > 0
      ? `${en ? "from" : "vanaf"} ${formatProductPrice(nlStandard.price, "EUR")}`
      : en
        ? "from € 6.95"
        : "vanaf € 6,95";

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <Header />
      <ContentPageLayout
        path="/verzending"
        heading={en ? "Shipping & delivery" : "Verzenden & bezorgen"}
        bodyHtml={(en ? shippingBodyEn : shippingBodyNl)(thresholdLabel, nlRateLabel)}
        featured={CONTENT_PHOTOS.storefront.src}
        featuredAlt={CONTENT_PHOTOS.storefront.alt}
        showCtas
      />
      <Footer />
    </main>
  );
}
