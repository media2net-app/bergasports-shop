"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCart } from "@/components/cart/CartProvider";
import BrandWordmark from "@/components/layout/BrandWordmark";
import HeaderIconButton, { HeaderIconLink } from "@/components/layout/HeaderIconButton";
import {
  HEADER_NAV_LEFT,
  HEADER_NAV_RIGHT,
  WEBSHOP_MENU_LINKS,
  type HeaderNavItem,
} from "@/components/layout/header-nav";
import HeaderSearchSlot from "@/components/layout/HeaderSearchSlot";
import HeaderShopMegaMenu from "@/components/layout/HeaderShopMegaMenu";

const navLinkClass =
  "text-[11px] font-bold uppercase tracking-[0.14em] text-white/85 transition hover:text-white md:text-xs";

function HeaderNavLink({
  href,
  label,
  badge,
  active,
}: {
  href: string;
  label: string;
  badge?: string;
  active?: boolean;
}) {
  return (
    <Link href={href} className={`${navLinkClass} inline-flex items-center gap-1.5 ${active ? "text-white" : ""}`}>
      {label}
      {badge ? (
        <span className="rounded bg-[var(--brand-mid)] px-1.5 py-0.5 text-[9px] font-bold tracking-normal text-[#1a1a1a]">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function renderNavItem(item: HeaderNavItem, pathname: string) {
  if (item.type === "dropdown") {
    return <HeaderShopMegaMenu key={item.label} label={item.label} />;
  }
  const active =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`) || pathname.startsWith(`${item.href}?`);
  return (
    <HeaderNavLink
      key={`${item.href}-${item.label}`}
      href={item.href}
      label={item.label}
      badge={item.badge}
      active={active}
    />
  );
}

function IconSearch() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" strokeLinecap="round" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-4 3.5-6 7-6s7 2 7 6" strokeLinecap="round" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        d="M12 20s-7-4.5-7-9.5a4.5 4.5 0 0 1 8-2.5 4.5 4.5 0 0 1 8 2.5C21 15.5 12 20 12 20z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBag() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M7 9V7a5 5 0 0 1 10 0v2" strokeLinecap="round" />
      <path d="M5 9h14l-1 12H6L5 9z" strokeLinejoin="round" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export default function Header() {
  const pathname = usePathname();
  const { totalItems, openCart } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <header
        id="site-header"
        className={`home-header sticky top-0 z-50 border-b border-white/8 bg-[var(--topbar)] text-[var(--topbar-foreground)] ${
          searchOpen ? "overflow-visible" : ""
        }`}
      >
        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6">
          <div className="grid h-[72px] grid-cols-[1fr_auto_1fr] items-center">
            {/* Links: menu naar logo (rechts uitlijnen in kolom) */}
            <div className="flex min-w-0 items-center justify-start md:justify-end md:pr-5 lg:pr-8">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 md:hidden"
                onClick={() => setIsMenuOpen(true)}
                aria-label="Menu openen"
              >
                <IconMenu />
              </button>
              <nav
                className="hidden items-center justify-end gap-3 md:flex lg:gap-4 xl:gap-5"
                aria-label="Navigatie links"
              >
                {HEADER_NAV_LEFT.map((item) => renderNavItem(item, pathname))}
              </nav>
            </div>

            {/* Midden: logo */}
            <div className="shrink-0 justify-self-center px-3 md:px-5">
              <BrandWordmark />
            </div>

            {/* Rechts: menu vanaf logo, iconen aan buitenkant */}
            <div className="flex min-w-0 items-center md:pl-5 lg:pl-8">
              <nav
                className="hidden items-center justify-start gap-3 md:flex lg:gap-4 xl:gap-5"
                aria-label="Navigatie rechts"
              >
                {HEADER_NAV_RIGHT.map((item) => renderNavItem(item, pathname))}
              </nav>
              <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-2 sm:gap-1 sm:pl-3">
              <HeaderIconButton
                label={searchOpen ? "Zoeken sluiten" : "Zoeken"}
                onClick={() => setSearchOpen((v) => !v)}
                aria-expanded={searchOpen}
              >
                <IconSearch />
              </HeaderIconButton>
              <HeaderIconLink href="/contact" label="Contact" className="hidden sm:inline-flex">
                <IconUser />
              </HeaderIconLink>
              <HeaderIconLink href="/shop" label="Favorieten" className="hidden md:inline-flex">
                <IconHeart />
              </HeaderIconLink>
              <HeaderIconButton label="Winkelwagen" onClick={openCart} badge={totalItems}>
                <IconBag />
              </HeaderIconButton>
              </div>
            </div>
          </div>

          {/* Uitklapbare zoekbalk — overflow-visible zodat resultaten niet worden afgesneden */}
          <div
            className={`transition-[max-height,opacity,padding] duration-300 ease-out ${
              searchOpen
                ? "max-h-[min(28rem,80vh)] overflow-visible pb-4 opacity-100"
                : "max-h-0 overflow-hidden opacity-0"
            }`}
          >
            <div className="mx-auto w-full max-w-2xl">
              <HeaderSearchSlot variant="dark" autoFocus={searchOpen} />
            </div>
          </div>
        </div>
      </header>

      {/* Mobiel menu */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 md:hidden ${
          isMenuOpen
            ? "pointer-events-auto bg-black/40 opacity-100"
            : "pointer-events-none bg-black/0 opacity-0"
        }`}
        onClick={() => setIsMenuOpen(false)}
      >
        <aside
          className={`absolute left-0 top-0 flex h-full w-[min(100%,20rem)] flex-col bg-[#1a1a1a] text-white shadow-xl transition-transform duration-300 ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <BrandWordmark compact />
            <button
              type="button"
              className="rounded-full border border-white/20 px-3 py-1 text-sm text-white/90"
              onClick={() => setIsMenuOpen(false)}
            >
              Sluiten
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-5 py-4" aria-label="Mobiel menu">
            <ul className="space-y-1">
              <li>
                <Link
                  href="/shop"
                  className={`block rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-wider ${
                    isActive("/shop") ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Webshop
                </Link>
              </li>
              {WEBSHOP_MENU_LINKS.map((sub) => (
                <li key={sub.href} className="pl-3">
                  <Link
                    href={sub.href}
                    className="block rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/5"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {sub.label}
                  </Link>
                </li>
              ))}
              {HEADER_NAV_LEFT.filter((i) => i.type === "link").map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-wider ${
                      isActive(item.href) ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                    {item.badge ? (
                      <span className="rounded bg-[var(--brand-mid)] px-1.5 py-0.5 text-[9px] text-[#1a1a1a]">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
              {HEADER_NAV_RIGHT.map((item) =>
                item.type === "link" ? (
                  <li key={`${item.href}-${item.label}`}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-wider ${
                        isActive(item.href) ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          </nav>
        </aside>
      </div>
    </>
  );
}
