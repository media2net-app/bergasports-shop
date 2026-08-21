"use client";

import LocalizedLink from "@/components/locale/LocalizedLink";
import { useMemo, useState } from "react";

import { useCategories } from "@/components/categories/CategoriesProvider";
import LanguageSwitcher from "@/components/locale/LanguageSwitcher";
import { useInstagramProfileUrl } from "@/components/layout/InstagramProfileProvider";
import { useShopNavBrands } from "@/components/layout/ShopNavBrandsProvider";
import { useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import { shopBrandListingHref } from "@/lib/brands-shared";
import { localizedAboutLinks, ui } from "@/lib/i18n/ui";
import { mobileNavFromCategoryTree } from "@/lib/shop-mega-menu-from-tree";

type Props = {
  onNavigate: () => void;
  isActive: (href: string) => boolean;
};

export default function MobileNavDrillDown({ onNavigate, isActive }: Props) {
  const { locale } = useShopLocale();
  const t = ui(locale);
  const { tree } = useCategories();
  const instagramUrl = useInstagramProfileUrl();
  const brands = useShopNavBrands();
  const navTree = useMemo(() => {
    const merken = {
      label: t.brands,
      children: [
        { href: "/merken", label: t.allBrands },
        ...brands.map((brand) => ({ href: shopBrandListingHref(brand.slug), label: brand.name })),
      ],
    };
    const items = [
      ...mobileNavFromCategoryTree(tree, {
        allProducts: t.allProducts,
        allIn: t.allIn,
        news: t.news,
        about: t.about,
        customApparel: t.customApparel,
        aboutLinks: localizedAboutLinks(locale),
      }),
    ];
    const nieuwsIndex = items.findIndex((item) => item.label === t.news);
    if (nieuwsIndex >= 0) {
      items.splice(nieuwsIndex, 0, merken);
    } else {
      items.push(merken);
    }
    return items;
  }, [brands, locale, t, tree]);
  const initialOpen =
    navTree.find((item) => item.children?.some((child) => isActive(child.href)))?.label ?? null;
  const [openGroup, setOpenGroup] = useState<string | null>(initialOpen);

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 overflow-y-auto px-4 py-3" aria-label={t.mobileMenu}>
        <ul className="space-y-0.5">
          {navTree.map((item) => {
            if (item.children?.length) {
              const open = openGroup === item.label;
              const groupActive = item.children.some((child) => isActive(child.href));
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-bold uppercase tracking-wider transition hover:bg-white/5 ${
                      groupActive ? "text-[var(--brand-mid)]" : "text-white/90"
                    }`}
                    onClick={() => setOpenGroup(open ? null : item.label)}
                    aria-expanded={open}
                  >
                    {item.label}
                    <svg
                      className={`h-3.5 w-3.5 text-white/50 transition ${open ? "rotate-180" : ""}`}
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M3 4.5L6 7.5L9 4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                  {open ? (
                    <ul
                      className={
                        item.label === t.brands
                          ? "mb-2 grid grid-cols-2 gap-x-1 gap-y-0.5 px-1"
                          : "mb-2 ml-2 space-y-0.5 border-l border-white/10 pl-3"
                      }
                    >
                      {item.children.map((child) => (
                        <li key={child.href} className={item.label === t.brands && child.href === "/merken" ? "col-span-2" : undefined}>
                          <LocalizedLink
                            href={child.href}
                            className={`block rounded-lg px-3 py-2.5 text-sm ${
                              isActive(child.href)
                                ? "bg-white/10 text-[var(--brand-mid)]"
                                : "text-white/75 hover:bg-white/5"
                            }`}
                            aria-current={isActive(child.href) ? "page" : undefined}
                            onClick={onNavigate}
                          >
                            {child.label}
                          </LocalizedLink>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            }
            if (!item.href) return null;
            return (
              <li key={item.label}>
                <LocalizedLink
                  href={item.href}
                  className={`flex items-center justify-between rounded-lg px-3 py-3 text-sm font-bold uppercase tracking-wider ${
                    isActive(item.href) ? "bg-white/10 text-[var(--brand-mid)]" : "text-white/80 hover:bg-white/5"
                  }`}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={onNavigate}
                >
                  {item.label}
                  {"badge" in item && item.badge ? (
                    <span className="rounded bg-[var(--brand-mid)] px-1.5 py-0.5 text-[9px] font-bold tracking-normal text-[#1a1a1a]">
                      {item.badge}
                    </span>
                  ) : null}
                </LocalizedLink>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="space-y-3 border-t border-white/10 px-5 py-4">
        <LanguageSwitcher />
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-white/70 hover:text-white"
        >
          Instagram
        </a>
      </div>
    </div>
  );
}
