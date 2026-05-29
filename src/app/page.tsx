import { Suspense } from "react";

import HeroFromCms from "@/components/home/HeroFromCms";
import HomeAboutSection from "@/components/home/HomeAboutSection";
import HomeAppointmentSection from "@/components/home/HomeAppointmentSection";
import HomeFeaturedSection from "@/components/home/HomeFeaturedSection";
import HomeFeaturedSkeleton from "@/components/home/HomeFeaturedSkeleton";
import HomeHeroFromCms from "@/components/home/HomeHeroFromCms";
import HomeIntroSection from "@/components/home/HomeIntroSection";
import HomeShopCategories from "@/components/home/HomeShopCategories";
import UspSection from "@/components/home/UspSection";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";

export const revalidate = 300;

export default function Home() {
  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <TrustBar />
      <Header />
      <Suspense fallback={<HeroFromCms blocks={null} />}>
        <HomeHeroFromCms />
      </Suspense>
      <div className="mx-auto w-full max-w-[1440px] space-y-12 px-4 py-10 md:space-y-14 md:py-12 lg:px-6">
        <HomeIntroSection />
        <HomeShopCategories />
        <Suspense fallback={<HomeFeaturedSkeleton />}>
          <HomeFeaturedSection />
        </Suspense>
        <HomeAboutSection />
        <HomeAppointmentSection />
        <UspSection />
      </div>
      <Footer />
    </main>
  );
}
