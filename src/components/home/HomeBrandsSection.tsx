import { HOME_BRANDS } from "@/lib/site-content";

export default function HomeBrandsSection() {
  return (
    <section className="text-center">
      <h2 className="font-[family-name:var(--font-heading)] text-2xl text-[var(--foreground)] md:text-3xl">
        Onze merken
      </h2>
      <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed tracking-wide text-[var(--foreground)]/70 md:text-base">
        {HOME_BRANDS}
      </p>
    </section>
  );
}
