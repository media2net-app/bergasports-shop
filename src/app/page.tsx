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

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
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
