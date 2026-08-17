"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { ShopMenuLink } from "@/lib/site-content";

const navLinkClass =
  "text-[11px] font-bold uppercase tracking-[0.14em] text-white/85 transition hover:text-white md:text-xs";

type Props = {
  label: string;
  items: ShopMenuLink[];
};

export default function HeaderSimpleDropdown({ label, items }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    <div className="relative" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className={`${navLinkClass} inline-flex items-center gap-1 ${active ? "text-white" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <span className="text-[9px] opacity-70">▾</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 min-w-[12rem] pt-2">
          <ul className="rounded-md border border-white/10 bg-[#1a1a1a] py-2 shadow-xl">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-4 py-2 text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
