"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { isShopNavigationPath, WEBSHOP_MEGA_MENU } from "@/lib/site-content";

const navLinkClass =
  "text-[11px] font-bold uppercase tracking-[0.14em] text-white/85 transition hover:text-white md:text-xs";

const columnLinkClass =
  "block py-1.5 text-sm font-normal text-white/75 transition hover:text-[var(--brand-mid)]";

/** Onzichtbare brug tussen header-link en panel (voorkomt hover-gap). */
const HOVER_BRIDGE_PX = 20;
const CLOSE_DELAY_MS = 220;

type Props = {
  label?: string;
};

export default function HeaderShopMegaMenu({ label = "Webshop" }: Props) {
  const pathname = usePathname();
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
  }, [clearCloseTimer]);

  const handleEnter = useCallback(() => {
    clearCloseTimer();
    const header = document.getElementById("site-header");
    if (header) {
      setPanelTop(header.getBoundingClientRect().bottom);
    }
    setOpen(true);
  }, [clearCloseTimer]);

  const panelVisible = open;

  return (
    <>
      {/* Donkere overlay op pagina-inhoud (onder header) */}
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

      {/* Trigger in header */}
      <div
        className="relative hidden md:block"
        onMouseEnter={handleEnter}
        onMouseLeave={scheduleClose}
      >
        <Link
          href="/shop"
          className={`${navLinkClass} inline-flex items-center gap-1 ${shopActive || open ? "text-white" : ""}`}
          aria-haspopup="true"
          aria-expanded={open}
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
        </Link>
      </div>

      {/* Panel + hover-brug (fixed, los van trigger-box voor betrouwbare hover) */}
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
        {/* Onzichtbare brug tot aan header */}
        <div className="w-full" style={{ height: HOVER_BRIDGE_PX }} aria-hidden />

        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6">
          <div className="overflow-hidden rounded-b-2xl border border-white/10 bg-[#111111] shadow-2xl">
            <div className="grid gap-8 px-6 py-8 md:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(240px,300px)] lg:px-10 lg:py-10">
              {WEBSHOP_MEGA_MENU.columns.map((column) => (
                <div key={column.title}>
                  <p className="text-sm font-bold text-white">{column.title}</p>
                  <ul className="mt-3 space-y-0.5">
                    {column.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className={columnLinkClass} onClick={() => setOpen(false)}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="rounded-xl bg-gradient-to-br from-[#f5f0e6] via-[#faf8f5] to-[#e8f4e8] p-5 text-[var(--foreground)]">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-hover)]">Bergasports</p>
                <p className="mt-2 font-[family-name:var(--font-heading)] text-lg font-bold leading-snug">
                  {WEBSHOP_MEGA_MENU.promo.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]/75">
                  {WEBSHOP_MEGA_MENU.promo.text}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href={WEBSHOP_MEGA_MENU.promo.ctaHref}
                    className="inline-flex w-fit rounded-full bg-[var(--topbar)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#333]"
                    onClick={() => setOpen(false)}
                  >
                    {WEBSHOP_MEGA_MENU.promo.cta}
                  </Link>
                  <Link
                    href={WEBSHOP_MEGA_MENU.promo.shopHref}
                    className="text-xs font-semibold text-[var(--brand-hover)] underline underline-offset-2"
                    onClick={() => setOpen(false)}
                  >
                    {WEBSHOP_MEGA_MENU.promo.shopCta} →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
