import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";

export const metadata: Metadata = {
  title: "Retourneren | Bergasports",
  description: "Retourtermijn, voorwaarden en terugbetaling bij Bergasports.",
  alternates: { canonical: "/retouren" },
};

export default function RetourenPage() {
  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <TrustBar />
      <Header />
      <article className="mx-auto max-w-[760px] px-4 py-12">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl">Retourneren</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--foreground)]/85">
          <p>Je hebt als consument recht op een bedenktijd volgens de wet. Neem contact op om een retour aan te melden.</p>
          <p>Producten moeten ongebruikt, compleet en in de originele verpakking worden geretourneerd, tenzij anders overeengekomen.</p>
          <p>Maatwerk, gemonteerde fietsen en hygiënegevoelige artikelen kunnen van retourrecht zijn uitgesloten.</p>
          <p>Terugbetaling volgt na ontvangst en controle, via dezelfde betaalmethode (Mollie).</p>
        </div>
        <Link href="/contact" className="mt-8 inline-flex text-xs font-bold uppercase tracking-wider underline">
          Retour aanmelden
        </Link>
      </article>
      <Footer />
    </main>
  );
}
