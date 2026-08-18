"use client";

import Link from "next/link";
import { useState } from "react";

import LanguageSwitcher from "@/components/locale/LanguageSwitcher";
import { useInstagramProfileUrl } from "@/components/layout/InstagramProfileProvider";
import { MOBILE_NAV_TREE } from "@/lib/site-content";

type Props = {
  onNavigate: () => void;
  isActive: (href: string) => boolean;
};

export default function MobileNavDrillDown({ onNavigate, isActive }: Props) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const instagramUrl = useInstagramProfileUrl();

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 overflow-y-auto px-5 py-4" aria-label="Mobiel menu">
        <ul className="space-y-1">
          {MOBILE_NAV_TREE.map((item) => {
            if (item.children?.length) {
              const open = openGroup === item.label;
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-bold uppercase tracking-wider text-white/90 hover:bg-white/5"
                    onClick={() => setOpenGroup(open ? null : item.label)}
                    aria-expanded={open}
                  >
                    {item.label}
                    <span className="text-white/50">{open ? "▾" : "›"}</span>
                  </button>
                  {open ? (
                    <ul className="mb-2 ml-2 space-y-0.5 border-l border-white/10 pl-3">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={`block rounded-lg px-3 py-2.5 text-sm ${
                              isActive(child.href)
                                ? "bg-white/10 text-white"
                                : "text-white/75 hover:bg-white/5"
                            }`}
                            onClick={onNavigate}
                          >
                            {child.label}
                          </Link>
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
                <Link
                  href={item.href}
                  className={`block rounded-lg px-3 py-3 text-sm font-bold uppercase tracking-wider ${
                    isActive(item.href) ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"
                  }`}
                  onClick={onNavigate}
                >
                  {item.label}
                </Link>
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
        <Link
          href="/afspraak#formulier"
          onClick={onNavigate}
          className="flex min-h-11 items-center justify-center rounded-md bg-[var(--brand-mid)] px-4 text-sm font-bold uppercase tracking-wide text-[#1a1a1a]"
        >
          Plan een afspraak
        </Link>
      </div>
    </div>
  );
}
