import Link from "next/link";

import { SHOP_MERCH_VIEWS } from "@/lib/shop-merchandising-views";

/**
 * Lightweight discovery row — links to /shop?view=… instead of rendering product grids on the homepage (LCP).
 */
export default function HomeMerchandisingLinks() {
  return (
    <section className="w-full" aria-labelledby="home-discover-title">
      <h2
        id="home-discover-title"
        className="text-2xl font-semibold text-[var(--foreground)] md:font-[family-name:var(--font-heading)] md:text-3xl"
      >
        Ontdek de webshop
      </h2>
      <p className="mt-1 text-sm text-[var(--foreground)]/70">
        Kies een selectie — producten openen in de webshop.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {SHOP_MERCH_VIEWS.map((item) => (
          <li key={item.id}>
            <Link
              href={`/shop?view=${item.id}`}
              className="flex h-full flex-col rounded-2xl border border-[#e5dcc8] bg-white p-4 transition hover:border-[#B38F27]/25 hover:shadow-md"
            >
              <span className="text-base font-semibold text-[var(--foreground)]">{item.title}</span>
              <span className="mt-1 flex-1 text-sm text-[var(--foreground)]/70">{item.description}</span>
              <span className="mt-3 text-sm font-semibold text-[#96741f]">Bekijk in webshop →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
