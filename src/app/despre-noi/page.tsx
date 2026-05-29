import { notFound } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import CmsPageView from "@/components/site/CmsPageView";
import { getPublishedPageByPath } from "@/lib/site-pages-db";

export const dynamic = "force-dynamic";

export default async function DespreNoiPage() {
  const page = await getPublishedPageByPath("/despre-noi");
  if (!page) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      <TrustBar />
      <Header />
      <CmsPageView page={page} />
      <Footer />
    </main>
  );
}
