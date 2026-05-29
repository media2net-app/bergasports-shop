import { notFound } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import CmsPageView from "@/components/site/CmsPageView";
import { SHOP_PHONE_LABEL, shopPhoneTelHref } from "@/lib/site-contact";
import { getPublishedPageByPath } from "@/lib/site-pages-db";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const page = await getPublishedPageByPath("/contact");
  if (!page) {
    notFound();
  }

  const bodyWithPhone = page.body_html.replace(
    "vezi numarul din footer",
    `<a href="${shopPhoneTelHref()}" class="font-semibold underline">${SHOP_PHONE_LABEL}</a>`,
  );

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      <TrustBar />
      <Header />
      <CmsPageView page={{ ...page, body_html: bodyWithPhone }} />
      <Footer />
    </main>
  );
}
