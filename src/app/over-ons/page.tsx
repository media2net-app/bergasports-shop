import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import { getPublishedPageByPath } from "@/lib/site-pages-db";
import CmsPageView from "@/components/site/CmsPageView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Over Bergasports | Ingmar Berga",
  description:
    "Van topsport naar Bergasports. Persoonlijk advies, hoogwaardig materiaal en ervaring in Dedemsvaart.",
  alternates: { canonical: "/over-ons" },
};

const FALLBACK_HTML = `
<p><strong>Meer dan een winkel. Je sportpartner.</strong></p>
<p>Mijn naam is Ingmar Berga. Van 2004 tot 2022 stond mijn leven in het teken van topsport. Als professioneel schaatser en skeeleraar heb ik ervaren hoe belangrijk materiaal, techniek en persoonlijke begeleiding zijn.</p>
<p>Die ervaring vormt de basis van Bergasports. Bij het leveren van sportmateriaal draait het niet alleen om een product verkopen — het gaat om de vraag: <em>Wat heb jij nodig om beter te worden?</em></p>
<p>Daarom kijken we naar jouw niveau, doelen, rijstijl, lichaam, huidige materiaal en hoe je het daadwerkelijk gebruikt.</p>
<p><a href="/contact">Maak een afspraak in Dedemsvaart</a></p>
`;

export default async function OverOnsPage() {
  const page = await getPublishedPageByPath("/over-ons");
  if (page) {
    return (
      <main className="min-h-screen bg-[#faf8f5]/40">
        <TrustBar />
        <Header />
        <CmsPageView page={page} />
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <TrustBar />
      <Header />
      <article className="mx-auto max-w-[760px] px-4 py-12">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl">Over Bergasports</h1>
        <div
          className="prose prose-neutral mt-6 max-w-none"
          dangerouslySetInnerHTML={{ __html: FALLBACK_HTML }}
        />
        <Link href="/contact" className="mt-8 inline-flex min-h-11 items-center bg-[var(--topbar)] px-5 text-xs font-bold uppercase tracking-wider text-white">
          Maak een afspraak
        </Link>
      </article>
      <Footer />
    </main>
  );
}
