import type { Metadata } from "next";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import ContentPageLayout from "@/components/site/ContentPageLayout";
import { CONTENT_PHOTOS } from "@/lib/content-photos";
import { formatProductPrice } from "@/lib/products";
import { buildPageMetadata } from "@/lib/seo";
import { DEFAULT_FREE_SHIPPING_THRESHOLD_EUR } from "@/lib/shop-delivery-trust";
import { getFreeShippingThresholdSetting } from "@/lib/shop-runtime";
import { listActiveShippingRates } from "@/lib/shipping-rates-db";

export const metadata: Metadata = buildPageMetadata({
  title: "Verzenden & bezorgen",
  description: "Verzendkosten, levertijden en afhalen bij Bergasports in Dedemsvaart.",
  path: "/verzending",
});

export const dynamic = "force-dynamic";

function shippingBody(thresholdLabel: string, nlRateLabel: string): string {
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

export default async function VerzendingPage() {
  const [threshold, rates] = await Promise.all([
    getFreeShippingThresholdSetting().catch(() => DEFAULT_FREE_SHIPPING_THRESHOLD_EUR),
    listActiveShippingRates().catch(() => []),
  ]);
  const nlStandard = rates.find((rate) => rate.countryCode === "NL" && rate.method === "standard");
  const thresholdLabel = formatProductPrice(threshold, "EUR");
  const nlRateLabel =
    nlStandard && nlStandard.price > 0
      ? `vanaf ${formatProductPrice(nlStandard.price, "EUR")}`
      : "vanaf € 6,95";

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <TrustBar />
      <Header />
      <ContentPageLayout
        path="/verzending"
        heading="Verzenden & bezorgen"
        bodyHtml={shippingBody(thresholdLabel, nlRateLabel)}
        featured={CONTENT_PHOTOS.storefront.src}
        featuredAlt={CONTENT_PHOTOS.storefront.alt}
        showCtas
      />
      <Footer />
    </main>
  );
}
