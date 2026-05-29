import type { HomepageBlocks } from "@/lib/site-pages";
import HomeHeroBanner from "@/components/home/HomeHeroBanner";

type HeroFromCmsProps = {
  blocks?: HomepageBlocks | null;
};

export default function HeroFromCms({ blocks }: HeroFromCmsProps) {
  return <HomeHeroBanner blocks={blocks} />;
}
