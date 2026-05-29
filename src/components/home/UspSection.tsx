import { HOME_VALUE_PROPS } from "@/lib/site-content";
import { SITE_BRAND_SHORT } from "@/lib/site-brand";

export default function UspSection() {
  return (
    <section className="w-full" aria-labelledby="usp-title">
      <div className="bg-[var(--brand)] px-4 py-10 text-white md:px-6 md:py-12">
        <div className="mx-auto w-full max-w-[1440px]">
          <h2
            id="usp-title"
            className="font-[family-name:var(--font-heading)] text-2xl font-semibold md:text-3xl"
          >
            Waarom {SITE_BRAND_SHORT}?
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {HOME_VALUE_PROPS.map((usp) => (
              <article key={usp.title}>
                <h3 className="text-lg font-semibold">{usp.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/85">{usp.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
