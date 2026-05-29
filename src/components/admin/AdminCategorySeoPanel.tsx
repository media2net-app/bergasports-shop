"use client";

import { useCallback, useEffect, useState } from "react";

import { formatRalexCategoryName } from "@/lib/ralex-categories";
import { shopCategoryPath } from "@/lib/shop-category-filter";

type Props = {
  categories: { slug: string; name: string }[];
};

export default function AdminCategorySeoPanel({ categories }: Props) {
  const [slug, setSlug] = useState(categories[0]?.slug ?? "");
  const [seoIntro, setSeoIntro] = useState("");
  const [seoFooterHtml, setSeoFooterHtml] = useState("");
  const [seoMetaTitle, setSeoMetaTitle] = useState("");
  const [seoMetaDescription, setSeoMetaDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (targetSlug: string) => {
    if (!targetSlug) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/categories/seo?slug=${encodeURIComponent(targetSlug)}`);
      const data = (await res.json()) as {
        seoIntro?: string;
        seoFooterHtml?: string;
        seoMetaTitle?: string;
        seoMetaDescription?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not load");
      }
      setSeoIntro(data.seoIntro ?? "");
      setSeoFooterHtml(data.seoFooterHtml ?? "");
      setSeoMetaTitle(data.seoMetaTitle ?? "");
      setSeoMetaDescription(data.seoMetaDescription ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(slug);
  }, [slug, load]);

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/categories/seo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, seoIntro, seoFooterHtml, seoMetaTitle, seoMetaDescription }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Save failed");
      }
      setMessage("SEO saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  const selected = categories.find((c) => c.slug === slug);

  return (
    <div className="admin-stack">
      <div className="admin-panel admin-stack-tight">
        <h2 className="admin-panel-title admin-m-0">Category SEO</h2>
        <p className="admin-muted admin-m-0">
          Page intro, optional HTML footer, and optional <strong>meta title / description</strong> for Google (unique
          per category — avoid duplicate boilerplate).
        </p>
        <label className="admin-field">
          <span className="admin-label">Category</span>
          <select
            className="admin-input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={loading || saving}
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {formatRalexCategoryName(c.name)}
              </option>
            ))}
          </select>
        </label>
        {selected ? (
          <p className="admin-muted admin-m-0 text-sm">
            Preview:{" "}
            <a href={shopCategoryPath(selected.slug)} className="font-semibold text-[#96741f] underline">
              {shopCategoryPath(selected.slug)}
            </a>
          </p>
        ) : null}
        <label className="admin-field">
          <span className="admin-label">Meta title (optional, ~60 chars)</span>
          <input
            type="text"
            className="admin-input"
            value={seoMetaTitle}
            onChange={(e) => setSeoMetaTitle(e.target.value)}
            disabled={loading || saving}
            placeholder={`${selected ? formatRalexCategoryName(selected.name) : "Categorie"} | Bergasports`}
            maxLength={120}
          />
          <span className="admin-muted text-xs">{seoMetaTitle.length}/120</span>
        </label>
        <label className="admin-field">
          <span className="admin-label">Meta description (optional, aim ≤155 chars)</span>
          <textarea
            className="admin-input admin-textarea"
            rows={3}
            value={seoMetaDescription}
            onChange={(e) => setSeoMetaDescription(e.target.value)}
            disabled={loading || saving}
            maxLength={320}
            placeholder="Rochii elegante damă — livrare în România, plată ramburs…"
          />
          <span className="admin-muted text-xs">{seoMetaDescription.length}/320</span>
        </label>
        <label className="admin-field">
          <span className="admin-label">Intro (short text)</span>
          <textarea
            className="admin-input admin-textarea"
            rows={4}
            value={seoIntro}
            onChange={(e) => setSeoIntro(e.target.value)}
            disabled={loading || saving}
          />
        </label>
        <label className="admin-field">
          <span className="admin-label">Footer HTML</span>
          <textarea
            className="admin-input admin-textarea font-mono text-sm"
            rows={8}
            value={seoFooterHtml}
            onChange={(e) => setSeoFooterHtml(e.target.value)}
            disabled={loading || saving}
          />
        </label>
        {error ? (
          <div className="admin-banner err admin-m-0" role="alert">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="admin-banner ok admin-m-0" role="status">
            {message}
          </div>
        ) : null}
        <div className="admin-form-actions">
          <button type="button" className="admin-btn-primary" disabled={loading || saving || !slug} onClick={save}>
            {saving ? "Saving…" : "Save SEO"}
          </button>
        </div>
      </div>
    </div>
  );
}
