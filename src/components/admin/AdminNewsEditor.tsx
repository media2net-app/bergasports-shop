"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import AdminFeaturedImagePanel from "@/components/admin/AdminFeaturedImagePanel";
import AdminHtmlEditor from "@/components/admin/AdminHtmlEditor";
import AdminImageUploadButton from "@/components/admin/AdminImageUploadButton";
import AdminLocaleTabs from "@/components/admin/AdminLocaleTabs";
import { useLocaleDraft } from "@/components/admin/useLocaleDraft";
import DateTimePicker from "@/components/ui/DateTimePicker";
import { isoToLocalDateTimeValue, localDateTimeValueToIso } from "@/lib/datetime-picker";
import { hydrateNewsTranslations } from "@/lib/i18n/hydrate";
import type { NewsLocaleFields } from "@/lib/i18n/translations";
import type { NewsPostRow } from "@/lib/news-db";
import { slugifyNl } from "@/lib/slugify";

const CATEGORIES = ["Algemeen", "Racefietsen", "LaFuga", "Nimbl", "Wedstrijden", "Tips"];

type Props = { post?: NewsPostRow };

export default function AdminNewsEditor({ post }: Props) {
  const router = useRouter();
  const isNew = !post;
  const {
    locale: editLocale,
    setLocale: setEditLocale,
    languages,
    fields: loc,
    setField: setLoc,
    compact,
    filled,
  } = useLocaleDraft<NewsLocaleFields>(
    post ? post.translations : hydrateNewsTranslations({ title: "", slug: "", bodyHtml: "" }),
  );
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "");
  const [category, setCategory] = useState(post?.category ?? "Algemeen");
  const [publishedAt, setPublishedAt] = useState(isoToLocalDateTimeValue(post?.publishedAt));
  const [isPublished, setIsPublished] = useState(post?.isPublished ?? false);
  const [socialImage, setSocialImage] = useState(post?.socialImage ?? "");
  const [noindex, setNoindex] = useState(post?.noindex ?? false);
  const [error, setError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const title = loc.title ?? "";
  const slug = loc.slug ?? "";
  const titlePreview = title.trim() || (isNew ? "Nieuw bericht" : "Bericht");
  const slugPreview = useMemo(() => slug.trim() || slugifyNl(title) || "", [slug, title]);
  const publicPath = slugPreview ? `/nieuws/${slugPreview}` : "";
  const statusLabel = isPublished ? "Gepubliceerd" : "Concept";

  async function save() {
    setError("");
    setSaveOk(false);
    setSaving(true);
    const translations = compact();
    const nl = translations.nl ?? loc;
    const payload = {
      title: nl.title || title,
      slug: nl.slug || slug || undefined,
      excerpt: nl.excerpt ?? "",
      bodyHtml: nl.bodyHtml ?? loc.bodyHtml ?? "",
      coverImage,
      imageAlt: nl.imageAlt ?? "",
      category,
      publishedAt: localDateTimeValueToIso(publishedAt),
      isPublished,
      seoTitle: nl.seoTitle ?? "",
      seoDescription: nl.seoDescription ?? "",
      ogTitle: nl.ogTitle ?? "",
      ogDescription: nl.ogDescription ?? "",
      socialImage,
      noindex,
      translations,
    };
    try {
      const res = await fetch(isNew ? "/api/admin/news" : `/api/admin/news/${post.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Opslaan mislukt");
        setSaving(false);
        return;
      }
      setSaveOk(true);
      if (isNew && data.id) {
        router.replace(`/admin/news/${data.id}`);
      }
      router.refresh();
    } catch {
      setError("Geen verbinding");
    }
    setSaving(false);
  }

  async function remove() {
    if (!post || !confirm("Dit bericht verwijderen?")) return;
    setDeleting(true);
    await fetch(`/api/admin/news/${post.id}`, { method: "DELETE" });
    router.replace("/admin/news");
    router.refresh();
  }

  function renderSaveActions() {
    return (
      <div className="admin-form-actions">
        {!isNew ? (
          <button type="button" className="admin-btn-danger" disabled={deleting || saving} onClick={() => void remove()}>
            {deleting ? "…" : "Verwijderen"}
          </button>
        ) : null}
        <button type="button" className="admin-btn-primary" disabled={saving || deleting} onClick={() => void save()}>
          {saving ? "Opslaan…" : "Opslaan"}
        </button>
      </div>
    );
  }

  return (
    <div className="admin-product-editor-root admin-stack">
      <div className="admin-page-head">
        <div>
          <Link href="/admin/news" className="admin-breadcrumb">
            ← Alle berichten
          </Link>
          <h1 className="admin-h1">{titlePreview}</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            {statusLabel}
            {slugPreview ? (
              <>
                {" "}
                · <code>{publicPath}</code>
              </>
            ) : (
              " · slug volgt uit de titel"
            )}
            {isPublished && publicPath ? (
              <>
                {" "}
                ·{" "}
                <a href={publicPath} target="_blank" rel="noopener noreferrer" className="admin-link-action">
                  Bekijk op site
                </a>
              </>
            ) : null}
          </p>
        </div>
        {renderSaveActions()}
      </div>

      <AdminLocaleTabs
        languages={languages}
        value={editLocale}
        onChange={setEditLocale}
        filledLocales={filled}
        hint="Titel, slug, tekst en SEO per taal. Nederlandse slug is /nieuws/… op .nl én .com (geen /en-prefix)."
      />

      {saveOk ? (
        <div className="admin-banner ok admin-m-0" role="status">
          Bericht opgeslagen.
        </div>
      ) : null}
      {error ? <div className="admin-error-box">{error}</div> : null}

      <div className="admin-product-editor-grid">
        <div className="admin-product-editor-main">
          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">Artikel</h2>
            <div>
              <label className="admin-label" htmlFor="news-title">
                Titel
              </label>
              <input
                id="news-title"
                className="admin-field admin-field--flush"
                value={title}
                onChange={(e) => setLoc("title", e.target.value)}
                placeholder="Kop van het bericht"
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="news-excerpt">
                Samenvatting
              </label>
              <textarea
                id="news-excerpt"
                className="admin-field admin-field--flush"
                rows={3}
                value={loc.excerpt ?? ""}
                onChange={(e) => setLoc("excerpt", e.target.value)}
                placeholder="Korte teaser voor de nieuwsoverzichtspagina"
              />
              <p className="admin-muted admin-m-0 admin-mt-05">
                Dit is de teaser op de overzichtspagina. Gewone tekst, geen HTML.
              </p>
            </div>
          </div>

          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">Inhoud</h2>
            <p className="admin-muted admin-m-0">
              Dit is de artikeltekst die bezoekers zien. Koppen, vet, lijsten, links en foto’s.
            </p>
            <AdminHtmlEditor
              minHeight="tall"
              placeholder="Schrijf het bericht…"
              value={loc.bodyHtml ?? ""}
              onChange={(html) => setLoc("bodyHtml", html)}
              imageFolder="uploads"
              onImageError={setError}
            />
          </div>
        </div>

        <aside className="admin-product-editor-side" aria-label="Publicatie, uitgelichte afbeelding en SEO">
          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">Publicatie</h2>
            <label className="admin-check-highlight">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              Gepubliceerd
            </label>
            <p className="admin-muted admin-m-0">
              {isPublished ? "Zichtbaar op /nieuws." : "Concept: alleen zichtbaar in het admin."}
            </p>
            <div>
              <label className="admin-label" htmlFor="news-published-at">
                Publicatiedatum en tijd
              </label>
              <DateTimePicker
                id="news-published-at"
                variant="admin"
                mode="datetime"
                minuteStep={15}
                value={publishedAt}
                onChange={setPublishedAt}
                placeholder="Kies publicatiedatum en tijd"
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="news-slug">
                URL / slug
              </label>
              <input
                id="news-slug"
                className="admin-field admin-field--flush"
                value={slug}
                onChange={(e) => setLoc("slug", e.target.value)}
                placeholder="wordt automatisch uit de titel gezet"
              />
              {publicPath ? (
                <p className="admin-muted admin-m-0 admin-mt-05">
                  {isPublished ? (
                    <a href={publicPath} target="_blank" rel="noopener noreferrer" className="admin-link-action">
                      {publicPath}
                    </a>
                  ) : (
                    <>
                      Wordt <code>{publicPath}</code> na publicatie
                    </>
                  )}
                </p>
              ) : (
                <p className="admin-muted admin-m-0 admin-mt-05">Slug volgt automatisch uit de titel als je dit leeg laat.</p>
              )}
            </div>
            <div>
              <label className="admin-label" htmlFor="news-category">
                Categorie
              </label>
              <select
                id="news-category"
                className="admin-field admin-field--flush"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <AdminFeaturedImagePanel
            image={coverImage}
            alt={loc.imageAlt ?? ""}
            onImageChange={setCoverImage}
            onAltChange={(alt) => setLoc("imageAlt", alt)}
            onError={setError}
            folder="uploads"
            urlId="news-cover"
            altId="news-image-alt"
            hint="Deze foto staat bovenaan het bericht, in het nieuwsoverzicht en bij delen op social media. Foto’s in de tekst voeg je in de editor in."
          />

          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">SEO &amp; social</h2>
            <p className="admin-muted admin-m-0">Optioneel. Leeg = titel en samenvatting van het bericht.</p>
            <div>
              <label className="admin-label" htmlFor="news-seo-title">
                SEO-titel
              </label>
              <input
                id="news-seo-title"
                className="admin-field admin-field--flush"
                value={loc.seoTitle ?? ""}
                onChange={(e) => setLoc("seoTitle", e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="news-seo-desc">
                Meta description
              </label>
              <textarea
                id="news-seo-desc"
                className="admin-field admin-field--flush"
                rows={3}
                value={loc.seoDescription ?? ""}
                onChange={(e) => setLoc("seoDescription", e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="news-og-title">
                Open Graph titel
              </label>
              <input
                id="news-og-title"
                className="admin-field admin-field--flush"
                value={loc.ogTitle ?? ""}
                onChange={(e) => setLoc("ogTitle", e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="news-og-desc">
                Open Graph tekst
              </label>
              <textarea
                id="news-og-desc"
                className="admin-field admin-field--flush"
                rows={2}
                value={loc.ogDescription ?? ""}
                onChange={(e) => setLoc("ogDescription", e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="news-social-image">
                Social image (optioneel)
              </label>
              <input
                id="news-social-image"
                className="admin-field admin-field--flush"
                value={socialImage}
                onChange={(e) => setSocialImage(e.target.value)}
                placeholder="Leeg = uitgelichte afbeelding"
              />
              <p className="admin-muted admin-m-0 admin-mt-05">
                Alleen invullen als delen op social media een andere foto moet krijgen.
              </p>
              <div className="admin-form-actions admin-mt-05">
                <AdminImageUploadButton
                  label="Uploaden"
                  folder="uploads"
                  onUploaded={(url) => {
                    setError("");
                    setSocialImage(url);
                  }}
                  onError={setError}
                />
              </div>
            </div>
            <label className="admin-check-highlight">
              <input type="checkbox" checked={noindex} onChange={(e) => setNoindex(e.target.checked)} />
              Niet indexeren (noindex)
            </label>
          </div>
        </aside>
      </div>

      <div className="admin-editor-sticky">
        <div className="admin-editor-sticky-inner">
          <span className="admin-muted" style={{ fontSize: "0.8rem" }}>
            {statusLabel}
            {slugPreview ? ` · ${publicPath}` : ""}
          </span>
          {renderSaveActions()}
        </div>
      </div>
    </div>
  );
}
