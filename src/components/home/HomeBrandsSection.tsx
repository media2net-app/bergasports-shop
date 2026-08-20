import LocalizedLink from "@/components/locale/LocalizedLink";

import SectionHeading from "@/components/home/SectionHeading";
import { listVisibleBrands } from "@/lib/brands-db";
import { brandSlugFromName, shopBrandListingHref } from "@/lib/brands-shared";
import { getRequestLocale } from "@/lib/i18n/locale";
import { ui } from "@/lib/i18n/ui";
import { HOME_BRAND_LIST, HOME_BRANDS } from "@/lib/site-content";

export default async function HomeBrandsSection() {
  const locale = await getRequestLocale();
  const t = ui(locale);
  const managed = await listVisibleBrands().catch(() => []);
  const brands =
    managed.length > 0
      ? managed.map((brand) => ({ name: brand.name, slug: brand.slug }))
      : HOME_BRAND_LIST.map((name) => ({ name, slug: brandSlugFromName(name) }));

  return (
    <section>
      <SectionHeading
        align="center"
        eyebrow={t.trustedBrands}
        title={t.ourBrands}
        text={HOME_BRANDS}
      />
      <div className="gold-divider mx-auto max-w-md" aria-hidden>
        <span />
      </div>
      <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-2">
        {brands.map((brand) => (
          <li key={brand.slug || brand.name}>
            {brand.slug ? (
              <LocalizedLink
                href={shopBrandListingHref(brand.slug)}
                className="inline-flex min-h-10 items-center rounded-full border border-[var(--brand-border)] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]/80 transition hover:border-[var(--brand)]/40"
              >
                {brand.name}
              </LocalizedLink>
            ) : (
              <span className="inline-flex min-h-10 items-center rounded-full border border-[var(--brand-border)] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]/80">
                {brand.name}
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-center">
        <LocalizedLink
          href="/merken"
          className="arrow-link inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand)]"
        >
          {t.moreBrands}
          <span aria-hidden className="arrow-link-icon">
            →
          </span>
        </LocalizedLink>
      </p>
    </section>
  );
}
