import { HOME_INSTAGRAM } from "@/lib/site-content";
import { getInstagramPreviewPosts, getInstagramPublicUrl } from "@/lib/instagram";

export default async function HomeInstagramSection() {
  const [posts, profileUrl] = await Promise.all([
    getInstagramPreviewPosts(6),
    getInstagramPublicUrl(),
  ]);
  return (
    <section>
      <div className="mb-6 max-w-2xl">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-[var(--foreground)] md:text-3xl">
          {HOME_INSTAGRAM.title}
        </h2>
        <p className="mt-3 text-sm text-[var(--foreground)]/70 md:text-base">{HOME_INSTAGRAM.text}</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-6 md:overflow-visible">
        {posts.map((post) => (
          <a
            key={post.id}
            href={post.permalink || profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-square w-[42vw] shrink-0 overflow-hidden bg-[var(--foreground)]/5 md:w-auto"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          </a>
        ))}
      </div>
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex min-h-11 items-center border-b border-[var(--foreground)] text-xs font-bold uppercase tracking-[0.14em] hover:border-[var(--brand)] hover:text-[var(--brand)]"
      >
        {HOME_INSTAGRAM.cta}
      </a>
    </section>
  );
}
