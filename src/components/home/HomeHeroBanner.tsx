import Image from "next/image";
import LocalizedLink from "@/components/locale/LocalizedLink";

import type { HomepageBlocks } from "@/lib/site-pages";
import { DEFAULT_HOMEPAGE_BLOCKS } from "@/lib/site-pages";
import { HOME_HERO_IMAGE_SRC, SITE_BRAND_NAME, SITE_SLOGAN, SITE_TAGLINE } from "@/lib/site-brand";

type Props = {
  blocks?: HomepageBlocks | null;
};

export default function HomeHeroBanner({ blocks }: Props) {
  const hero = { ...DEFAULT_HOMEPAGE_BLOCKS.hero, ...blocks?.hero };

  return (
    <section className="relative isolate w-full overflow-hidden bg-[#1a1a1a]">
      <Image
        src={HOME_HERO_IMAGE_SRC}
        alt={`${SITE_BRAND_NAME} winkel in Dedemsvaart`}
        fill
        priority
        quality={92}
        unoptimized
        sizes="(min-width: 1024px) 1024px, 100vw"
        className="object-cover object-center"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/25 md:via-black/45 md:to-transparent"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" aria-hidden />
      <div
        className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-[var(--brand)]/25 blur-[110px]"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-[min(72vh,640px)] w-full max-w-[1440px] flex-col justify-end px-4 py-14 sm:min-h-[min(68vh,720px)] sm:justify-center sm:py-20 md:px-8 lg:px-10">
        <div className="max-w-xl">
          <p className="fade-up flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-mid)] md:text-sm">
            <span
              className="h-px w-8 bg-gradient-to-r from-[var(--brand-mid)] to-transparent"
              aria-hidden
            />
            {hero.eyebrow ?? SITE_SLOGAN}
          </p>
          <h1 className="fade-up fade-up-1 mt-4 whitespace-pre-line font-[family-name:var(--font-heading)] text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.25rem]">
            {hero.title ?? `Welkom bij ${SITE_BRAND_NAME}`}
          </h1>
          <p className="fade-up fade-up-2 mt-5 max-w-lg text-sm leading-relaxed text-white/85 md:text-base">
            {hero.subtitle ?? SITE_TAGLINE}
          </p>
          <div className="fade-up fade-up-3 mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LocalizedLink
              href="/shop"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand-mid)] px-7 py-3.5 text-sm font-bold text-[#1a1a1a] transition duration-300 hover:bg-[#f2d680]"
            >
              {hero.ctaShop ?? "Naar de shop"}
              <span aria-hidden className="transition duration-300 group-hover:translate-x-1">
                →
              </span>
            </LocalizedLink>
            <LocalizedLink
              href="/over-ons"
              className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white/20"
            >
              {hero.ctaOffers ?? "Mijn verhaal"}
            </LocalizedLink>
          </div>
        </div>
      </div>
    </section>
  );
}
