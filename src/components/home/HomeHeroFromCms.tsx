import HeroFromCms from "@/components/home/HeroFromCms";
import { getRequestLocale } from "@/lib/i18n/locale";
import { pickTranslation, type PageLocaleFields } from "@/lib/i18n/translations";
import { getPublishedPageByPath } from "@/lib/site-pages-db";
import type { HomepageBlocks } from "@/lib/site-pages";

/** CMS hero in Suspense so trust bar + shell HTML can stream without waiting on site_pages. */
export default async function HomeHeroFromCms() {
  let blocks: HomepageBlocks | null | undefined = null;
  try {
    const [homePage, locale] = await Promise.all([getPublishedPageByPath("/"), getRequestLocale()]);
    const overlay = homePage ? pickTranslation<PageLocaleFields>(homePage.translations, locale) : undefined;
    blocks = overlay?.blocks ?? homePage?.blocks ?? null;
  } catch {
    blocks = null;
  }
  return <HeroFromCms blocks={blocks} />;
}
