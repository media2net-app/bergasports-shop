import HeroFromCms from "@/components/home/HeroFromCms";
import { getRequestLocale } from "@/lib/i18n/locale";
import { hasLocaleContent, type PageLocaleFields } from "@/lib/i18n/translations";
import { getPublishedPageByPath } from "@/lib/site-pages-db";
import type { HomepageBlocks } from "@/lib/site-pages";

/** CMS hero in Suspense so trust bar + shell HTML can stream without waiting on site_pages. */
export default async function HomeHeroFromCms() {
  let blocks: HomepageBlocks | null | undefined = null;
  const locale = await getRequestLocale().catch(() => "nl");
  try {
    const homePage = await getPublishedPageByPath("/");
    const map = homePage?.translations as Record<string, PageLocaleFields> | null | undefined;
    const exact = map?.[locale];
    const enHeroOnly = locale === "en";
    if (enHeroOnly) {
      // Geen NL-fallback: anders blijft de CMS-hero Nederlands.
      blocks = exact && hasLocaleContent(exact) && exact.blocks?.hero ? exact.blocks : null;
    } else {
      blocks = exact?.blocks ?? homePage?.blocks ?? null;
    }
  } catch {
    blocks = null;
  }
  return <HeroFromCms blocks={blocks} locale={locale} />;
}
