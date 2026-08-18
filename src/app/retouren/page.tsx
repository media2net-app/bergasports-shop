import type { Metadata } from "next";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import ContentPageLayout from "@/components/site/ContentPageLayout";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Retourneren",
  description: "Retourtermijn, voorwaarden en terugbetaling bij Bergasports.",
  path: "/retouren",
});

const BODY = `
<p>Je hebt als consument recht op een bedenktijd volgens de wet. Meld een retour eerst bij ons aan, zodat we de zending kunnen verwachten.</p>
<h2>Voorwaarden</h2>
<p>Producten moeten ongebruikt, compleet en in de originele verpakking worden geretourneerd, tenzij anders overeengekomen.</p>
<p>Maatwerk, gemonteerde fietsen en hygiënegevoelige artikelen kunnen van retourrecht zijn uitgesloten.</p>
<h2>Terugbetaling</h2>
<p>Terugbetaling volgt na ontvangst en controle, via dezelfde betaalmethode (Mollie).</p>
<p class="cms-cta-row">
  <a class="cms-cta cms-cta-primary" href="/contact">Retour aanmelden</a>
  <a class="cms-cta" href="/verzending">Verzending &amp; bezorging</a>
</p>
`;

export default function RetourenPage() {
  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <TrustBar />
      <Header />
      <ContentPageLayout path="/retouren" heading="Retourneren" bodyHtml={BODY} showCtas />
      <Footer />
    </main>
  );
}
