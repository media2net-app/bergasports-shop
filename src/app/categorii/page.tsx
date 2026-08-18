import LocalizedLink from "@/components/locale/LocalizedLink";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import RalexCategoryTree from "@/components/shop/RalexCategoryTree";
import { loadRalexCategories } from "@/lib/categories-db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Categorieën",
  description:
    "Alle webshopcategorieën van Bergasports — racefietsen, wielen, schoenen, kleding, helmen en accessoires.",
};

export default async function CategoriiPage() {
  const { tree, fetchedAt, totalCategories } = await loadRalexCategories();

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      <TrustBar />
      <Header />

      <section className="mx-auto w-full max-w-[1440px] px-4 py-6 md:py-10">
        <LocalizedLink href="/shop" className="text-sm font-semibold text-[var(--foreground)] hover:underline">
          ← Terug naar webshop
        </LocalizedLink>

        <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold text-[var(--foreground)] md:text-4xl">
          Webshopcategorieën
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--foreground)]/80">
          Kies een categorie om producten uit de Bergasports-catalogus te bekijken. Laatst bijgewerkt:{" "}
          <span className="font-medium">{new Date(fetchedAt).toLocaleString("nl-NL")}</span> —{" "}
          {totalCategories} categorieën.
        </p>

        <div className="mt-8 rounded-2xl border border-[#e5dcc8] bg-white p-5 md:p-8">
          <RalexCategoryTree tree={tree} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
