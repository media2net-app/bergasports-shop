import type { Metadata } from "next";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ContentPageLayout from "@/components/site/ContentPageLayout";
import { getRequestLocale } from "@/lib/i18n/locale";
import { toUiLocale } from "@/lib/i18n/ui";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const BODY_NL = `
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

const BODY_EN = `
<p>As a consumer you have a statutory cooling-off period. Please register a return with us first so we know to expect the shipment.</p>
<h2>Conditions</h2>
<p>Products must be unused, complete and in the original packaging unless otherwise agreed.</p>
<p>Custom gear, assembled bikes and hygiene-sensitive items may be excluded from the right of withdrawal.</p>
<h2>Refund</h2>
<p>Refunds follow after receipt and inspection, via the same payment method (Mollie).</p>
<p class="cms-cta-row">
  <a class="cms-cta cms-cta-primary" href="/contact">Register a return</a>
  <a class="cms-cta" href="/verzending">Shipping &amp; delivery</a>
</p>
`;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const en = toUiLocale(locale) === "en";
  return buildPageMetadata({
    title: en ? "Returns" : "Retourneren",
    description: en
      ? "Return window, conditions and refunds at Bergasports."
      : "Retourtermijn, voorwaarden en terugbetaling bij Bergasports.",
    path: "/retouren",
  });
}

export default async function RetourenPage() {
  const locale = await getRequestLocale();
  const en = toUiLocale(locale) === "en";

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <Header />
      <ContentPageLayout
        path="/retouren"
        heading={en ? "Returns" : "Retourneren"}
        bodyHtml={en ? BODY_EN : BODY_NL}
        showCtas
      />
      <Footer />
    </main>
  );
}
