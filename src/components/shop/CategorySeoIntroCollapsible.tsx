"use client";

import { useState } from "react";

import type { CategorySeoContent } from "@/lib/category-seo";

/** Short intro on mobile with Lees meer; full text always in DOM for SEO. */
export function CategorySeoIntroCollapsible({ seo }: { seo: CategorySeoContent }) {
  const [open, setOpen] = useState(false);
  const long = seo.intro.length > 220;

  return (
    <div className="mt-3 max-w-3xl">
      <p
        className={`text-sm leading-relaxed text-[var(--foreground)]/85 md:text-base ${
          !open && long ? "line-clamp-3 md:line-clamp-none" : ""
        }`}
      >
        {seo.intro}
      </p>
      {long ? (
        <button
          type="button"
          className="mt-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)] md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Minder" : "Lees meer"}
        </button>
      ) : null}
    </div>
  );
}
