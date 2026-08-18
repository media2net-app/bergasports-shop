"use client";

import LocalizedLink from "@/components/locale/LocalizedLink";
import { stripLocalePrefix } from "@/lib/i18n/locale-shared";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { headerNavLinkActiveClass, headerNavLinkClass } from "@/components/layout/header-nav";
import type { ShopMenuLink } from "@/lib/site-content";

const CLOSE_DELAY_MS = 220;

type Props = {
  label: string;
  items: ShopMenuLink[];
};

export default function HeaderSimpleDropdown({ label, items }: Props) {
  const pathname = stripLocalePrefix(usePathname() || "/").pathname;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const active = items.some(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`) || pathname.startsWith(`${i.href}?`),
  );

  return (
    <div
      className="relative"
      ref={ref}
      onMouseEnter={() => {
        clearCloseTimer();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={`${headerNavLinkClass} ${active || open ? headerNavLinkActiveClass : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
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
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 min-w-[13rem] pt-2">
          <ul className="rounded-xl border border-white/10 bg-[#111111] py-2 shadow-xl">
            {items.map((item) => {
              const itemActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`) ||
                pathname.startsWith(`${item.href}?`);
              return (
                <li key={item.href}>
                  <LocalizedLink
                    href={item.href}
                    className={`block px-4 py-2 text-sm transition hover:bg-white/5 hover:text-[var(--brand-mid)] ${
                      itemActive ? "text-[var(--brand-mid)]" : "text-white/80"
                    }`}
                    aria-current={itemActive ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </LocalizedLink>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
