"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import LocalizedLink from "@/components/locale/LocalizedLink";

import { useCart } from "@/components/cart/CartProvider";
import BrandWordmark from "@/components/layout/BrandWordmark";
import HeaderIconButton, { HeaderIconLink } from "@/components/layout/HeaderIconButton";
import {
  HEADER_NAV_LEFT,
  HEADER_NAV_RIGHT,
  headerNavLinkActiveClass,
  headerNavLinkClass,
  type HeaderNavItem,
} from "@/components/layout/header-nav";
import HeaderSearchSlot from "@/components/layout/HeaderSearchSlot";
import HeaderShopMegaMenu from "@/components/layout/HeaderShopMegaMenu";
import HeaderSimpleDropdown from "@/components/layout/HeaderSimpleDropdown";
import MobileNavDrillDown from "@/components/layout/MobileNavDrillDown";
import TrustBar from "@/components/layout/TrustBar";
import { useInstagramProfileUrl } from "@/components/layout/InstagramProfileProvider";
import LanguageSwitcher from "@/components/locale/LanguageSwitcher";
import { stripLocalePrefix } from "@/lib/i18n/locale-shared";

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
    <LocalizedLink
      href={href}
      className={`${headerNavLinkClass} ${active ? headerNavLinkActiveClass : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {label}
      {badge ? (
        <span className="rounded bg-[var(--brand-mid)] px-1.5 py-0.5 text-[9px] font-bold tracking-normal text-[#1a1a1a]">
          {badge}
        </span>
      ) : null}
    </LocalizedLink>
  );
}

function renderNavItem(item: HeaderNavItem, pathname: string) {
  if (item.type === "mega") {
    return <HeaderShopMegaMenu key={item.label} label={item.label} />;
  }
  if (item.type === "dropdown") {
    return <HeaderSimpleDropdown key={item.label} label={item.label} items={item.items} />;
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

function IconClose() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export default function Header() {
  const rawPathname = usePathname();
  const pathname = stripLocalePrefix(rawPathname || "/").pathname;
  const { totalItems, openCart } = useCart();
  const instagramUrl = useInstagramProfileUrl();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchForPath, setSearchForPath] = useState(rawPathname);
  if (rawPathname !== searchForPath) {
    setSearchForPath(rawPathname);
    setSearchOpen(false);
    setIsMenuOpen(false);
  }

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

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [isMenuOpen]);

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
        <TrustBar />
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)]/70 to-transparent"
          aria-hidden
        />
        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6">
          <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-[68px]">
            <div className="flex min-w-0 items-center justify-start md:justify-end md:pr-4 lg:pr-6">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 md:hidden"
                onClick={() => setIsMenuOpen(true)}
                aria-label="Menu openen"
                aria-expanded={isMenuOpen}
                aria-controls="mobile-nav"
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

            <div className="shrink-0 justify-self-center px-2 md:px-4">
              <BrandWordmark />
            </div>

            <div className="flex min-w-0 items-center md:pl-4 lg:pl-6">
              <nav
                className="hidden items-center justify-start gap-3 md:flex lg:gap-4 xl:gap-5"
                aria-label="Navigatie rechts"
              >
                {HEADER_NAV_RIGHT.map((item) => renderNavItem(item, pathname))}
              </nav>
              <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-1 sm:gap-1 sm:pl-2">
                <LanguageSwitcher className="mr-1 hidden lg:inline-flex" />
                <HeaderIconButton
                  label={searchOpen ? "Zoeken sluiten" : "Zoeken"}
                  onClick={() => setSearchOpen((v) => !v)}
                  aria-expanded={searchOpen}
                >
                  <IconSearch />
                </HeaderIconButton>
                <HeaderIconLink href="/account" label="Account" className="hidden sm:inline-flex">
                  <IconUser />
                </HeaderIconLink>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 xl:inline-flex"
                  aria-label="Instagram"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
                <HeaderIconButton label="Winkelwagen" onClick={openCart} badge={totalItems}>
                  <IconBag />
                </HeaderIconButton>
              </div>
            </div>
          </div>

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

      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 md:hidden ${
          isMenuOpen
            ? "pointer-events-auto bg-black/50 opacity-100"
            : "pointer-events-none bg-black/0 opacity-0"
        }`}
        onClick={() => setIsMenuOpen(false)}
      >
        <aside
          id="mobile-nav"
          role="dialog"
          aria-modal={isMenuOpen}
          aria-label="Menu"
          className={`absolute left-0 top-0 flex h-full w-[min(100%,20rem)] flex-col bg-[#1a1a1a] text-white shadow-xl transition-transform duration-300 ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <BrandWordmark compact />
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Menu sluiten"
            >
              <IconClose />
            </button>
          </div>
          <nav className="flex min-h-0 flex-1 flex-col" aria-label="Mobiel menu">
            <MobileNavDrillDown onNavigate={() => setIsMenuOpen(false)} isActive={isActive} />
          </nav>
        </aside>
      </div>
    </>
  );
}
