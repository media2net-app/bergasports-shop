"use client";

import LocalizedLink from "@/components/locale/LocalizedLink";
import { useCategories } from "@/components/categories/CategoriesProvider";
import { formatRalexCategoryName } from "@/lib/ralex-categories";
import { buildShopListingUrl } from "@/lib/shop-category-filter";

function categoryHref(slug: string) {
  return buildShopListingUrl({ cat: slug, page: 1, colors: [], sizes: [], search: null });
}

export default function HomeCategorySidebar() {
  const { tree } = useCategories();

  return (
    <aside className="w-full shrink-0 lg:sticky lg:top-28 lg:z-20 lg:w-64" id="categorii-acasa">
      <div className="overflow-hidden rounded-xl border border-[#e5dcc8] bg-white shadow-sm">
        <div className="bg-[var(--brand-surface-alt)] px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--foreground)]">
          Productcategorieën
        </div>
        <nav
          className="max-h-[min(52vh,420px)] overflow-y-auto lg:max-h-[calc(100vh-12rem)]"
          aria-label="Productcategorieën"
        >
          {tree.map((root) => {
            const label = formatRalexCategoryName(root.name, root.slug);
            if (root.children?.length) {
              return (
                <details key={root.id} className="home-cat-details group border-b border-[var(--brand-border-soft)] last:border-b-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 bg-[var(--brand)] px-3 py-2.5 text-left text-[13px] font-semibold leading-snug text-white marker:content-none hover:bg-[var(--brand-hover)]">
                    <span>{label}</span>
                    <span className="text-sm opacity-80 transition group-open:rotate-90" aria-hidden>
                      ›
                    </span>
                  </summary>
                  <div className="border-t border-[var(--brand-border)] bg-[var(--brand-surface)] py-1">
                    <LocalizedLink
                      href={categoryHref(root.slug)}
                      className="block px-3 py-2 text-xs font-semibold text-[#96741f] hover:bg-white/80"
                    >
                      Bekijk alles — {label}
                    </LocalizedLink>
                    {root.children.map((ch) => (
                      <LocalizedLink
                        key={ch.id}
                        href={categoryHref(ch.slug)}
                        className="block border-t border-[#f0ead8] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-white"
                      >
                        {formatRalexCategoryName(ch.name, ch.slug)}
                      </LocalizedLink>
                    ))}
                  </div>
                </details>
              );
            }
            return (
              <LocalizedLink
                key={root.id}
                href={categoryHref(root.slug)}
                className="block border-b border-[var(--brand-border-soft)] bg-[var(--brand)] px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--brand-hover)] last:border-b-0"
              >
                {label}
              </LocalizedLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
