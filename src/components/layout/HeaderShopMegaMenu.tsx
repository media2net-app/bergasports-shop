"use client";

import LocalizedLink from "@/components/locale/LocalizedLink";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCategories } from "@/components/categories/CategoriesProvider";
import { headerNavLinkActiveClass, headerNavLinkClass } from "@/components/layout/header-nav";
import { useShopNavBrands } from "@/components/layout/ShopNavBrandsProvider";
import { useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import { shopBrandListingHref } from "@/lib/brands-shared";
import { ui } from "@/lib/i18n/ui";
import { stripLocalePrefix } from "@/lib/i18n/locale-shared";
import { megaMenuColumnsFromCategoryTree } from "@/lib/shop-mega-menu-from-tree";
import { isShopNavigationPath } from "@/lib/site-content";

const columnLinkClass =
  "block rounded-md px-1.5 py-1.5 text-sm font-normal text-white/75 transition hover:bg-white/5 hover:text-[var(--brand-mid)]";
const columnLinkActiveClass = "bg-white/8 text-[var(--brand-mid)]";

/** Onzichtbare brug tussen header-link en panel (voorkomt hover-gap). */
const HOVER_BRIDGE_PX = 20;
const CLOSE_DELAY_MS = 220;

type Props = {
  label?: string;
};

function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(`${href}?`);
}

export default function HeaderShopMegaMenu({ label }: Props) {
  const { locale } = useShopLocale();
  const t = ui(locale);
  const { tree } = useCategories();
  const menuColumns = useMemo(
    () =>
      megaMenuColumnsFromCategoryTree(tree, {
        allLabel: locale === "en" ? "All" : "Alles",
        customApparelLabel: t.customApparel,
      }),
    [tree, locale, t.customApparel],
  );
  const triggerLabel = label ?? t.webshop;
  const pathname = stripLocalePrefix(usePathname() || "/").pathname;
  const shopActive = isShopNavigationPath(pathname);
  const brands = useShopNavBrands();
  const [open, setOpen] = useState(false);
  const [panelTop, setPanelTop] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const updateTop = () => {
      const header = document.getElementById("site-header");
      setPanelTop(header ? header.getBoundingClientRect().bottom : 104);
    };
    updateTop();
    window.addEventListener("resize", updateTop);
    window.addEventListener("scroll", updateTop, { passive: true });
    return () => {
      window.removeEventListener("resize", updateTop);
      window.removeEventListener("scroll", updateTop);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [clearCloseTimer, setOpen]);

  const handleEnter = useCallback(() => {
    clearCloseTimer();
    const header = document.getElementById("site-header");
    if (header) {
      setPanelTop(header.getBoundingClientRect().bottom);
    }
    setOpen(true);
  }, [clearCloseTimer, setOpen]);

  const panelVisible = open;
  const xlCols =
    menuColumns.length <= 4
      ? "xl:grid-cols-4"
      : menuColumns.length === 5
        ? "xl:grid-cols-5"
        : "xl:grid-cols-6";

  return (
    <>
      <div
        className={`fixed left-0 right-0 bottom-0 z-[65] bg-black/50 transition-opacity duration-200 ${
          panelVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ top: panelTop }}
        aria-hidden={!panelVisible}
        onMouseEnter={handleEnter}
        onMouseLeave={scheduleClose}
        onClick={() => setOpen(false)}
      />

      <div
        className="relative hidden md:block"
        onMouseEnter={handleEnter}
        onMouseLeave={scheduleClose}
      >
        <LocalizedLink
          href="/shop"
          className={`${headerNavLinkClass} ${shopActive || open ? headerNavLinkActiveClass : ""}`}
          aria-haspopup="true"
          aria-expanded={open}
          aria-current={shopActive ? "page" : undefined}
          onFocus={handleEnter}
        >
          {triggerLabel}
          <svg
            className={`h-3 w-3 opacity-70 transition ${open ? "rotate-180" : ""}`}
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
          >
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </LocalizedLink>
      </div>

      <div
        className={`fixed left-0 right-0 z-[70] transition-all duration-200 ${
          panelVisible ? "pointer-events-auto visible opacity-100" : "pointer-events-none invisible opacity-0"
        }`}
        style={{ top: Math.max(0, panelTop - HOVER_BRIDGE_PX) }}
        onMouseEnter={handleEnter}
        onMouseLeave={scheduleClose}
        role="dialog"
        aria-label={t.shopCategories}
        aria-hidden={!panelVisible}
      >
        <div className="w-full" style={{ height: HOVER_BRIDGE_PX }} aria-hidden />

        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6">
          <div className="overflow-hidden rounded-b-2xl border border-white/10 bg-[#111111] shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/8 px-6 py-3 xl:px-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">{t.categories}</p>
              <LocalizedLink
                href="/shop"
                className="text-xs font-semibold text-[var(--brand-mid)] transition hover:text-[#f2d680]"
                onClick={() => setOpen(false)}
              >
                {t.allProducts} →
              </LocalizedLink>
            </div>
            <div
              className={`grid grid-cols-2 gap-x-6 gap-y-8 px-6 py-7 md:grid-cols-3 xl:gap-x-5 xl:px-8 xl:py-8 ${xlCols}`}
            >
              {menuColumns.map((column) => {
                const titleActive = column.href ? pathMatches(pathname, column.href) : false;
                const columnTitle = column.title;
                return (
                  <div key={`${column.href ?? ""}-${columnTitle}`}>
                    {column.href ? (
                      <LocalizedLink
                        href={column.href}
                        className={`text-[11px] font-bold uppercase tracking-[0.14em] transition hover:text-[var(--brand-mid)] ${
                          titleActive ? "text-[var(--brand-mid)]" : "text-white"
                        }`}
                        onClick={() => setOpen(false)}
                      >
                        {columnTitle}
                      </LocalizedLink>
                    ) : (
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                        {columnTitle}
                      </p>
                    )}
                    {column.links.length > 0 ? (
                      <ul className="mt-3 space-y-0.5">
                        {column.links.map((link) => {
                          const active = pathMatches(pathname, link.href);
                          return (
                            <li key={`${link.href}-${link.label}`}>
                              <LocalizedLink
                                href={link.href}
                                className={`${columnLinkClass} ${active ? columnLinkActiveClass : ""}`}
                                aria-current={active ? "page" : undefined}
                                onClick={() => setOpen(false)}
                              >
                                {link.label}
                              </LocalizedLink>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {brands.length > 0 ? (
              <div className="border-t border-white/8 px-6 py-5 xl:px-10">
                <div className="mb-3 flex items-baseline justify-between gap-4">
                  <LocalizedLink
                    href="/merken"
                    className={`text-[11px] font-bold uppercase tracking-[0.14em] transition hover:text-[var(--brand-mid)] ${
                      pathname === "/merken" ? "text-[var(--brand-mid)]" : "text-white"
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {t.brands}
                  </LocalizedLink>
                  <LocalizedLink
                    href="/merken"
                    className="shrink-0 text-xs font-semibold text-[var(--brand-mid)] transition hover:text-[#f2d680]"
                    onClick={() => setOpen(false)}
                  >
                    {t.allBrands} →
                  </LocalizedLink>
                </div>
                <ul className="grid grid-cols-3 gap-x-4 gap-y-0.5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
                  {brands.map((brand) => (
                    <li key={brand.slug}>
                      <LocalizedLink
                        href={shopBrandListingHref(brand.slug)}
                        className={`${columnLinkClass} truncate`}
                        onClick={() => setOpen(false)}
                      >
                        {brand.name}
                      </LocalizedLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
