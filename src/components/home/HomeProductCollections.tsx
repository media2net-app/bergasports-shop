"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

type TabId = "fietsen" | "nimbl";

type Props = {
  fietsenHref: string;
  nimblHref: string;
  fietsenGrid: ReactNode;
  nimblGrid: ReactNode;
};

export default function HomeProductCollections({
  fietsenHref,
  nimblHref,
  fietsenGrid,
  nimblGrid,
}: Props) {
  const [tab, setTab] = useState<TabId>("fietsen");
  const href = tab === "fietsen" ? fietsenHref : nimblHref;
  const label = tab === "fietsen" ? "Alle fietsen" : "Alle Nimbl-schoenen";

  return (
    <section id="oferte" className="w-full">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
            Bekijk onze producten
          </p>
          <h2 className="section-rule mt-2 font-[family-name:var(--font-heading)] text-2xl tracking-tight text-[var(--foreground)] md:text-3xl">
            Fietsen en Nimbl
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--foreground)]/70">
            Twee collecties die we zelf rijden en in Dedemsvaart laten passen: race, gravel en
            mountainbike, plus wielrenschoenen van Nimbl.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Productcollecties">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "fietsen"}
            className={`inline-flex min-h-11 items-center rounded-full px-5 text-xs font-bold uppercase tracking-[0.14em] transition ${
              tab === "fietsen"
                ? "bg-[var(--topbar)] text-white"
                : "border border-[var(--brand-border)] bg-white text-[var(--foreground)] hover:border-[var(--brand)]"
            }`}
            onClick={() => setTab("fietsen")}
          >
            Fietsen
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "nimbl"}
            className={`inline-flex min-h-11 items-center rounded-full px-5 text-xs font-bold uppercase tracking-[0.14em] transition ${
              tab === "nimbl"
                ? "bg-[var(--topbar)] text-white"
                : "border border-[var(--brand-border)] bg-white text-[var(--foreground)] hover:border-[var(--brand)]"
            }`}
            onClick={() => setTab("nimbl")}
          >
            Nimbl
          </button>
        </div>
      </div>

      <div className="mt-8" role="tabpanel">
        {tab === "fietsen" ? fietsenGrid : nimblGrid}
      </div>

      <p className="mt-8 text-center">
        <Link
          href={href}
          className="group inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--brand)]/40 bg-white px-7 text-sm font-semibold text-[#96741f] transition duration-300 hover:border-[var(--brand)] hover:bg-[var(--brand-surface-alt)]"
        >
          {label}
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </p>
    </section>
  );
}
