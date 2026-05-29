/** Placeholder while featured products stream in — keeps layout stable, no images. */
export default function HomeFeaturedSkeleton() {
  return (
    <section className="w-full" aria-hidden>
      <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-[#f0ead8]/80" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[401/601] animate-pulse rounded-2xl bg-[#f0ead8]/60" />
        ))}
      </div>
    </section>
  );
}
