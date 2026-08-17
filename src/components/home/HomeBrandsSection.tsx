import SectionHeading from "@/components/home/SectionHeading";
import { HOME_BRANDS } from "@/lib/site-content";

export default function HomeBrandsSection() {
  return (
    <section>
      <SectionHeading
        align="center"
        eyebrow="Merken die we vertrouwen"
        title="Onze merken"
        text={HOME_BRANDS}
      />
      <div className="gold-divider mx-auto max-w-md" aria-hidden>
        <span />
      </div>
    </section>
  );
}
