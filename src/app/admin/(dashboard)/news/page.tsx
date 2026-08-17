import Link from "next/link";

import { loadNewsPosts } from "@/lib/news-db";

export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
  const posts = await loadNewsPosts({ limit: 100 });
  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Nieuws</h1>
      <p className="text-sm text-black/60">
        {posts.length} artikelen (WP-migratie). Bewerken via DB/script; CMS-editor volgt.
      </p>
      <ul className="divide-y rounded border bg-white">
        {posts.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-xs text-black/50">/{`nieuws/${p.slug}`}</p>
            </div>
            <Link href={`/nieuws/${p.slug}`} className="text-[#96741f] underline" target="_blank">
              Bekijk
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
