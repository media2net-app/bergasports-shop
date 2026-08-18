"use client";

import LocalizedLink from "@/components/locale/LocalizedLink";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { headerNavLinkActiveClass, headerNavLinkClass } from "@/components/layout/header-nav";
import { isShopNavigationPath, WEBSHOP_MEGA_MENU } from "@/lib/site-content";
import { stripLocalePrefix } from "@/lib/i18n/locale-shared";

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

export default function HeaderShopMegaMenu({ label = "Webshop" }: Props) {
  const pathname = stripLocalePrefix(usePathname() || "/").pathname;
  const shopActive = isShopNavigationPath(pathname);
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
          {label}
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
        aria-label="Webshop categorieën"
        aria-hidden={!panelVisible}
      >
        <div className="w-full" style={{ height: HOVER_BRIDGE_PX }} aria-hidden />

        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6">
          <div className="overflow-hidden rounded-b-2xl border border-white/10 bg-[#111111] shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/8 px-6 py-3 xl:px-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Categorieën</p>
              <LocalizedLink
                href="/shop"
                className="text-xs font-semibold text-[var(--brand-mid)] transition hover:text-[#f2d680]"
                onClick={() => setOpen(false)}
              >
                Alle producten →
              </LocalizedLink>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-8 px-6 py-7 md:grid-cols-3 xl:grid-cols-6 xl:px-10 xl:py-8">
              {WEBSHOP_MEGA_MENU.columns.map((column) => {
                const titleActive = column.href ? pathMatches(pathname, column.href) : false;
                if (column.links.length === 0 && column.href) {
                  return (
                    <div key={column.title}>
                      <LocalizedLink
                        href={column.href}
                        className={`block rounded-xl border px-3 py-3 transition ${
                          titleActive
                            ? "border-[var(--brand-mid)]/50 bg-white/5"
                            : "border-white/10 hover:border-[var(--brand-mid)]/40"
                        }`}
                        onClick={() => setOpen(false)}
                      >
                        <span className="text-sm font-bold text-white">{column.title}</span>
                        <span className="mt-1 block text-xs text-white/50">Bekijken →</span>
                      </LocalizedLink>
                    </div>
                  );
                }
                return (
                  <div key={column.title}>
                    {column.href ? (
                      <LocalizedLink
                        href={column.href}
                        className={`text-[11px] font-bold uppercase tracking-[0.14em] transition hover:text-[var(--brand-mid)] ${
                          titleActive ? "text-[var(--brand-mid)]" : "text-white"
                        }`}
                        onClick={() => setOpen(false)}
                      >
                        {column.title}
                      </LocalizedLink>
                    ) : (
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white">{column.title}</p>
                    )}
                    {column.links.length > 0 ? (
                      <ul className="mt-3 space-y-0.5">
                        {column.links.map((link) => {
                          const active = pathMatches(pathname, link.href);
                          return (
                            <li key={link.href}>
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

              <div className="col-span-2 rounded-xl bg-gradient-to-br from-[#f5f0e6] via-[#faf8f5] to-[#e8f4e8] p-5 text-[var(--foreground)] md:col-span-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand-hover)]">
                  Bergasports
                </p>
                <p className="mt-2 font-[family-name:var(--font-heading)] text-base font-bold leading-snug">
                  {WEBSHOP_MEGA_MENU.promo.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]/75">
                  {WEBSHOP_MEGA_MENU.promo.text}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <LocalizedLink
                    href={WEBSHOP_MEGA_MENU.promo.ctaHref}
                    className="inline-flex w-fit rounded-full bg-[var(--topbar)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#333]"
                    onClick={() => setOpen(false)}
                  >
                    {WEBSHOP_MEGA_MENU.promo.cta}
                  </LocalizedLink>
                  <LocalizedLink
                    href={WEBSHOP_MEGA_MENU.promo.shopHref}
                    className="text-xs font-semibold text-[var(--brand-hover)] underline underline-offset-2"
                    onClick={() => setOpen(false)}
                  >
                    {WEBSHOP_MEGA_MENU.promo.shopCta} →
                  </LocalizedLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
