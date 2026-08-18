import SectionHeading from "@/components/home/SectionHeading";
import { HOME_INSTAGRAM } from "@/lib/site-content";
import { getInstagramHandle, getInstagramPreviewPosts, getInstagramPublicUrl } from "@/lib/instagram";

export default async function HomeInstagramSection() {
  const [posts, profileUrl, handle] = await Promise.all([
    getInstagramPreviewPosts(6),
    getInstagramPublicUrl(),
    getInstagramHandle(),
  ]);

  return (
    <section>
      <SectionHeading
        eyebrow={handle}
        title={HOME_INSTAGRAM.title}
        text={HOME_INSTAGRAM.text}
        action={
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="arrow-link inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] transition hover:text-[var(--brand)]"
          >
            {HOME_INSTAGRAM.cta}
            <span aria-hidden className="arrow-link-icon">
              →
            </span>
          </a>
        }
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
              alt={post.alt}
              className="media-zoom h-full w-full object-cover"
              loading="lazy"
            />
            <span
              className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
            <span className="absolute bottom-3 left-3 right-3 translate-y-2 text-xs font-medium leading-snug text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              {post.caption ? post.caption.slice(0, 90) : handle}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
