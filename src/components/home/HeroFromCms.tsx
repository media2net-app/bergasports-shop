import type { HomepageBlocks } from "@/lib/site-pages";
import HomeHeroBanner from "@/components/home/HomeHeroBanner";

type HeroFromCmsProps = {
  blocks?: HomepageBlocks | null;
  locale?: string;
};

export default function HeroFromCms({ blocks, locale }: HeroFromCmsProps) {
  return <HomeHeroBanner blocks={blocks} locale={locale} />;
}
