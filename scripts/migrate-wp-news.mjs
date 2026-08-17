#!/usr/bin/env node
/**
 * Migrate WP posts → news_posts.
 * Usage: DATABASE_URL=... node scripts/migrate-wp-news.mjs
 */
import { randomUUID } from "node:crypto";
import pg from "pg";

const base = (process.env.WC_STORE_BASE_URL || "https://www.bergasports.com").replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

function strip(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(s) {
  return (
    String(s || "")
      .toLowerCase()
      .replace(/%[0-9a-f]{2}/gi, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || `post-${Date.now()}`
  );
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? undefined : { rejectUnauthorized: false },
  max: 1,
});

let page = 1;
let imported = 0;
for (;;) {
  const res = await fetch(`${base}/wp-json/wp/v2/posts?per_page=50&page=${page}&_embed=1`);
  if (!res.ok) break;
  const posts = await res.json();
  if (!Array.isArray(posts) || !posts.length) break;

  for (const post of posts) {
    const title = strip(post.title?.rendered || post.slug);
    const slug = slugify(post.slug || title);
    const excerpt = strip(post.excerpt?.rendered || "").slice(0, 400);
    const body = post.content?.rendered || "";
    const cover =
      post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ||
      post.jetpack_featured_media_url ||
      null;
    const publishedAt = post.date_gmt || post.date || new Date().toISOString();
    await pool.query(
      `INSERT INTO news_posts (
        id, slug, title, excerpt, body_html, cover_image, category, locale,
        published_at, is_published, source_url, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'nl',
        $8::timestamptz, true, $9, NOW(), NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        excerpt = EXCLUDED.excerpt,
        body_html = EXCLUDED.body_html,
        cover_image = EXCLUDED.cover_image,
        published_at = EXCLUDED.published_at,
        source_url = EXCLUDED.source_url,
        updated_at = NOW()`,
      [
        randomUUID(),
        slug,
        title,
        excerpt || null,
        body,
        cover,
        "bergasports",
        publishedAt,
        post.link || null,
      ],
    );
    imported += 1;
  }

  const totalPages = Number(res.headers.get("X-WP-TotalPages") || 1);
  if (page >= totalPages) break;
  page += 1;
}

await pool.end();
console.log({ imported, pages: page });
