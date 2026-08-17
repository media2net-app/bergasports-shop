import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";

export const metadata: Metadata = {
  title: "Verzenden & bezorgen | Bergasports",
  description: "Verzendkosten, levertijden en afhalen bij Bergasports in Dedemsvaart.",
  alternates: { canonical: "/verzending" },
};

export default function VerzendingPage() {
  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <TrustBar />
      <Header />
      <article className="mx-auto max-w-[760px] px-4 py-12">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl">Verzenden & bezorgen</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--foreground)]/85">
          <p>
            <strong>Nederland:</strong> standaard verzending vanaf € 6,95. Gratis verzending vanaf € 150
            (uitgezonderd grote/fietszendingen — daarover overleggen we).
          </p>
          <p>
            <strong>België / Duitsland / EU:</strong> tarieven worden in de checkout getoond op basis van land.
          </p>
          <p>
            <strong>Afhalen:</strong> gratis afhalen op afspraak in Dedemsvaart (Julianastraat 3A).
          </p>
          <p>Levertijden zijn indicatief en afhankelijk van voorraad en verzenddienst. Track &amp; trace volgt per e-mail.</p>
        </div>
        <Link href="/contact" className="mt-8 inline-flex text-xs font-bold uppercase tracking-wider underline">
          Vragen over verzending?
        </Link>
      </article>
      <Footer />
    </main>
  );
}
