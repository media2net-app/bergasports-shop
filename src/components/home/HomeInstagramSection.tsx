import SectionHeading from "@/components/home/SectionHeading";
import { HOME_INSTAGRAM, INSTAGRAM_HANDLE } from "@/lib/site-content";
import { getInstagramPreviewPosts, getInstagramPublicUrl } from "@/lib/instagram";

export default async function HomeInstagramSection() {
  const [posts, profileUrl] = await Promise.all([
    getInstagramPreviewPosts(6),
    getInstagramPublicUrl(),
  ]);
  return (
    <section>
      <SectionHeading
        eyebrow={INSTAGRAM_HANDLE}
        title={HOME_INSTAGRAM.title}
        text={HOME_INSTAGRAM.text}
      />
      <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-6 md:overflow-visible">
        {posts.map((post) => (
          <a
            key={post.id}
            href={post.permalink || profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square w-[42vw] shrink-0 overflow-hidden rounded-2xl bg-[var(--brand-surface-alt)] ring-1 ring-[var(--brand-border)] transition duration-300 hover:ring-2 hover:ring-[var(--brand)]/50 md:w-auto"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.imageUrl}
              alt=""
              className="media-zoom h-full w-full object-cover"
              loading="lazy"
            />
            <span
              className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
          </a>
        ))}
      </div>
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="arrow-link mt-6 inline-flex min-h-11 items-center gap-2 border-b border-[var(--foreground)] text-xs font-bold uppercase tracking-[0.14em] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
      >
        {HOME_INSTAGRAM.cta}
        <span aria-hidden className="arrow-link-icon">
          →
        </span>
      </a>
    </section>
  );
}
