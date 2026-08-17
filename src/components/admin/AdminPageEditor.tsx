"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AdminImageUploadButton from "@/components/admin/AdminImageUploadButton";
import type { HomepageBlocks, SitePageRow } from "@/lib/site-pages";
import { DEFAULT_HOMEPAGE_BLOCKS } from "@/lib/site-pages";

type AdminPageEditorProps = {
  page: SitePageRow;
};

export default function AdminPageEditor({ page }: AdminPageEditorProps) {
  const router = useRouter();
  const isHome = page.slug === "home";

  const [title, setTitle] = useState(page.title);
  const [heading, setHeading] = useState(page.heading ?? "");
  const [bodyHtml, setBodyHtml] = useState(page.body_html);
  const [metaTitle, setMetaTitle] = useState(page.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(page.meta_description ?? "");
  const [isPublished, setIsPublished] = useState(page.is_published);
  const [hero, setHero] = useState<NonNullable<HomepageBlocks["hero"]>>({
    ...DEFAULT_HOMEPAGE_BLOCKS.hero,
    ...page.blocks?.hero,
  });

  const [error, setError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError("");
    setSaveOk(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          heading: heading || null,
          body_html: bodyHtml,
          blocks: isHome ? { hero } : null,
          meta_title: metaTitle || null,
          meta_description: metaDescription || null,
          is_published: isPublished,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        setSaving(false);
        return;
      }
      setSaveOk(true);
      router.refresh();
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  const fieldClass = "admin-field";

  return (
    <div className="admin-stack">
      <Link href="/admin/pages" className="admin-breadcrumb">
        ← Alle pagina’s
      </Link>

      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">{title || page.title}</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Pad: <code>{page.path}</code> · Slug: <code>{page.slug}</code>
            {page.path !== "/" ? (
              <>
                {" "}
                ·{" "}
                <a href={page.path} target="_blank" rel="noopener noreferrer" className="admin-link-action">
                  Bekijk op site
                </a>
              </>
            ) : (
              <>
                {" "}
                ·{" "}
                <a href="/" target="_blank" rel="noopener noreferrer" className="admin-link-action">
                  Bekijk op site
                </a>
              </>
            )}
          </p>
        </div>
        <button type="button" onClick={save} disabled={saving} className="admin-btn-primary admin-w-fit">
          {saving ? "Opslaan…" : "Opslaan"}
        </button>
      </div>

      {saveOk ? (
        <div className="admin-banner ok admin-m-0" role="status">
          Pagina opgeslagen.
        </div>
      ) : null}
      {error ? <div className="admin-error-box">{error}</div> : null}

      <div className="admin-panel admin-stack-tight">
        <label className="admin-label" htmlFor="page-title">
          Titel (admin)
        </label>
        <input id="page-title" className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} />

        <label className="admin-label admin-mt-1" htmlFor="page-heading">
          Kop (H1)
        </label>
        <input id="page-heading" className={fieldClass} value={heading} onChange={(e) => setHeading(e.target.value)} />

        <label className="admin-label admin-mt-1">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} /> Gepubliceerd
        </label>
      </div>

      {isHome ? (
        <div className="admin-panel admin-stack-tight">
          <h2 className="admin-h2 admin-m-0">Homepage hero</h2>
          {(
            [
              ["eyebrow", "Eyebrow"],
              ["title", "Main title"],
              ["subtitle", "Subtitle"],
              ["ctaShop", "Shop button"],
              ["ctaOffers", "Offers button"],
              ["promoLabel", "Promo label"],
              ["promoTitle", "Promo title"],
              ["promoText", "Promo text"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="admin-label" htmlFor={`hero-${key}`}>
                {label}
              </label>
              <input
                id={`hero-${key}`}
                className={fieldClass}
                value={hero[key] ?? ""}
                onChange={(e) => setHero((h) => ({ ...h, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-panel admin-stack-tight">
          <div className="admin-tools-row" style={{ justifyContent: "space-between" }}>
            <h2 className="admin-h2 admin-m-0">Content (HTML)</h2>
            <AdminImageUploadButton
              label="Foto invoegen"
              folder="pages"
              onUploaded={(url) => {
                setError("");
                const block = `<p><img src="${url}" alt="" /></p>\n`;
                setBodyHtml((prev) => `${prev.trimEnd()}\n${block}`);
              }}
              onError={(message) => setError(message)}
            />
          </div>
          <p className="admin-muted admin-m-0 admin-text-sm">
            Eenvoudige HTML: &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;a href=&quot;…&quot;&gt;, &lt;strong&gt;, &lt;img
            src=&quot;…&quot;&gt;. Upload een foto om die onderaan de tekst te zetten.
          </p>
          <textarea
            className={`${fieldClass} admin-field--tall-xl admin-field--mono`}
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={16}
          />
        </div>
      )}

      <div className="admin-panel admin-stack-tight">
        <h2 className="admin-h2 admin-m-0">SEO (optioneel)</h2>
        <label className="admin-label" htmlFor="meta-title">
          Meta title
        </label>
        <input id="meta-title" className={fieldClass} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
        <label className="admin-label admin-mt-1" htmlFor="meta-desc">
          Meta description
        </label>
        <textarea
          id="meta-desc"
          className={`${fieldClass} admin-field--tall`}
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}
