import type { Metadata } from "next";
import { Suspense } from "react";

import HeroFromCms from "@/components/home/HeroFromCms";
import HomeAboutTeaser from "@/components/home/HomeAboutTeaser";
import HomeAdviceSection from "@/components/home/HomeAdviceSection";
import HomeBrandsSection from "@/components/home/HomeBrandsSection";
import HomeFeaturedSection from "@/components/home/HomeFeaturedSection";
import HomeFeaturedSkeleton from "@/components/home/HomeFeaturedSkeleton";
import HomeHeroFromCms from "@/components/home/HomeHeroFromCms";
import HomeInstagramSection from "@/components/home/HomeInstagramSection";
import HomeNewsSection from "@/components/home/HomeNewsSection";
import HomePillarsSection from "@/components/home/HomePillarsSection";
import HomeVisitSection from "@/components/home/HomeVisitSection";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import {
  buildPageMetadata,
  localBusinessJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { PAGE_SEO, SHOP_OPENING_HOURS } from "@/lib/site-content";
import { getPublishedPageByPath } from "@/lib/site-pages-db";
import { getShopOpeningHours } from "@/lib/shop-runtime";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPageByPath("/");
  return buildPageMetadata({
    absoluteTitle: page?.meta_title?.trim() || PAGE_SEO.home.title,
    description: page?.meta_description?.trim() || PAGE_SEO.home.description,
    path: "/",
    image: page?.social_image,
    imageAlt: page?.image_alt || page?.title,
    noindex: page?.noindex,
    ogTitle: page?.og_title,
    ogDescription: page?.og_description,
  });
}

export default async function Home() {
  const hours = await getShopOpeningHours().catch(() => SHOP_OPENING_HOURS);
  const jsonLd = [organizationJsonLd(), websiteJsonLd(), localBusinessJsonLd(hours)];

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      {jsonLd.map((schema) => (
        <script
          key={schema["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <TrustBar />
      <Header />
      <Suspense fallback={<HeroFromCms blocks={null} />}>
        <HomeHeroFromCms />
      </Suspense>
      <div className="mx-auto w-full max-w-[1440px] space-y-14 px-4 py-10 md:space-y-16 md:py-12 lg:px-6">
        <HomePillarsSection />
        <Suspense fallback={<HomeFeaturedSkeleton />}>
          <HomeFeaturedSection />
        </Suspense>
        <HomeBrandsSection />
        <HomeAdviceSection />
        <HomeAboutTeaser />
        <Suspense fallback={null}>
          <HomeNewsSection />
        </Suspense>
        <Suspense fallback={null}>
          <HomeInstagramSection />
        </Suspense>
        <HomeVisitSection />
      </div>
      <Footer />
    </main>
  );
}
