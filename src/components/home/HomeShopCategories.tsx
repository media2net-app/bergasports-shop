import LocalizedLink from "@/components/locale/LocalizedLink";

import { WEBSHOP_MENU_LINKS } from "@/lib/site-content";

export default function HomeShopCategories() {
  return (
    <section className="w-full" aria-labelledby="home-shop-cats-title">
      <h2
        id="home-shop-cats-title"
        className="text-2xl font-semibold text-[var(--foreground)] md:font-[family-name:var(--font-heading)] md:text-3xl"
      >
        Webshop
      </h2>
      <p className="mt-1 text-sm text-[var(--foreground)]/70">
        Fietsen, skeelers, schoenen, kleding, wielen en accessoires.
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {WEBSHOP_MENU_LINKS.map((item) => (
          <li key={item.href}>
            <LocalizedLink
              href={item.href}
              className="flex h-full items-center rounded-xl border border-[#e5dcc8] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--brand)]/40 hover:shadow-sm"
            >
              {item.label}
            </LocalizedLink>
          </li>
        ))}
      </ul>
      <p className="mt-4">
        <LocalizedLink href="/shop" className="text-sm font-semibold text-[var(--brand-hover)] underline underline-offset-2">
          Naar de volledige webshop →
        </LocalizedLink>
      </p>
    </section>
  );
}
