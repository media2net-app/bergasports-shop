import HeroFromCms from "@/components/home/HeroFromCms";
import { getPublishedPageByPath } from "@/lib/site-pages-db";

/** CMS hero in Suspense so trust bar + shell HTML can stream without waiting on site_pages. */
export default async function HomeHeroFromCms() {
  try {
    const homePage = await getPublishedPageByPath("/");
    return <HeroFromCms blocks={homePage?.blocks} />;
  } catch {
    return <HeroFromCms blocks={null} />;
  }
}
