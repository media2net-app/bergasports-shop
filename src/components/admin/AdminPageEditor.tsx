"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import AdminFeaturedImagePanel from "@/components/admin/AdminFeaturedImagePanel";
import AdminHtmlEditor from "@/components/admin/AdminHtmlEditor";
import type { HomepageBlocks, SitePageRow } from "@/lib/site-pages";
import { DEFAULT_HOMEPAGE_BLOCKS } from "@/lib/site-pages";
import { slugifyNl } from "@/lib/slugify";

type Props = { page?: SitePageRow };

export default function AdminPageEditor({ page }: Props) {
  const router = useRouter();
  const isNew = !page;
  const isHome = page?.slug === "home";

  const [title, setTitle] = useState(page?.title || page?.heading || "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [bodyHtml, setBodyHtml] = useState(page?.body_html ?? "");
  const [metaTitle, setMetaTitle] = useState(page?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(page?.meta_description ?? "");
  const [ogTitle, setOgTitle] = useState(page?.og_title ?? "");
  const [ogDescription, setOgDescription] = useState(page?.og_description ?? "");
  const [socialImage, setSocialImage] = useState(page?.social_image ?? "");
  const [imageAlt, setImageAlt] = useState(page?.image_alt ?? "");
  const [noindex, setNoindex] = useState(page?.noindex ?? false);
  const [isPublished, setIsPublished] = useState(page?.is_published ?? false);
  const [hero, setHero] = useState<NonNullable<HomepageBlocks["hero"]>>({
    ...DEFAULT_HOMEPAGE_BLOCKS.hero,
    ...page?.blocks?.hero,
  });

  const [error, setError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [saving, setSaving] = useState(false);

  const titlePreview = title.trim() || (isNew ? "Nieuwe pagina" : "Pagina");
  const slugPreview = useMemo(() => {
    if (page) return page.slug;
    return slugifyNl(slug) || slugifyNl(title) || "";
  }, [page, slug, title]);
  const publicPath = page?.path ?? (slugPreview ? `/${slugPreview}` : "");
  const statusLabel = isPublished ? "Gepubliceerd" : "Concept";

  function heroField<K extends keyof NonNullable<HomepageBlocks["hero"]>>(key: K, value: string) {
    setHero((h) => ({ ...h, [key]: value }));
  }

  async function save() {
    setError("");
    setSaveOk(false);
    setSaving(true);
    const payload = {
      title,
      heading: title.trim() || null,
      body_html: isHome ? page?.body_html ?? "" : bodyHtml,
      blocks: isHome ? { hero } : null,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      og_title: ogTitle || null,
      og_description: ogDescription || null,
      social_image: socialImage || null,
      image_alt: imageAlt || null,
      noindex,
      is_published: isPublished,
      ...(isNew ? { slug: slugPreview || undefined } : {}),
    };
    try {
      const res = await fetch(page ? `/api/admin/pages/${page.id}` : "/api/admin/pages", {
        method: page ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { id?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Opslaan mislukt");
        setSaving(false);
        return;
      }
      setSaveOk(true);
      if (isNew && data.id) {
        router.replace(`/admin/pages/${data.id}`);
      }
      router.refresh();
    } catch {
      setError("Geen verbinding");
    }
    setSaving(false);
  }

  function renderSaveActions() {
    return (
      <div className="admin-form-actions">
        <button type="button" className="admin-btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Opslaan…" : "Opslaan"}
        </button>
      </div>
    );
  }

  return (
    <div className="admin-product-editor-root admin-stack">
      <div className="admin-page-head">
        <div>
          <Link href="/admin/pages" className="admin-breadcrumb">
            ← Alle pagina’s
          </Link>
          <h1 className="admin-h1">{titlePreview}</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            {statusLabel}
            {isHome ? " · Homepage" : ""}
            {publicPath ? (
              <>
                {" "}
                · <code>{publicPath}</code>
              </>
            ) : (
              " · pad volgt uit de titel"
            )}
            {publicPath ? (
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

      {saveOk ? (
        <div className="admin-banner ok admin-m-0" role="status">
          Pagina opgeslagen.
        </div>
      ) : null}
      {error ? <div className="admin-error-box">{error}</div> : null}

      <div className="admin-product-editor-grid">
        <div className="admin-product-editor-main">
          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">Pagina</h2>
            <div>
              <label className="admin-label" htmlFor="page-title">
                Titel
              </label>
              <input
                id="page-title"
                className="admin-field admin-field--flush"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isHome ? "Naam van de homepage" : "Titel bovenaan de pagina"}
              />
              <p className="admin-muted admin-m-0 admin-mt-05">
                {isHome
                  ? "Naam in het overzicht. De zichtbare H1 is de hoofdtitel in de hero hieronder."
                  : "Dit is de H1 die bezoekers bovenaan de pagina zien."}
              </p>
            </div>
          </div>

          {isHome ? (
            <>
              <div className="admin-panel-surface admin-stack-tight">
                <h2 className="admin-section-title">Hero</h2>
                <p className="admin-muted admin-m-0">
                  De grote kop op de homepage. Gewone tekst, geen HTML.
                </p>
                <div>
                  <label className="admin-label" htmlFor="hero-eyebrow">
                    Bovenregel
                  </label>
                  <input
                    id="hero-eyebrow"
                    className="admin-field admin-field--flush"
                    value={hero.eyebrow ?? ""}
                    onChange={(e) => heroField("eyebrow", e.target.value)}
                    placeholder="Bergasports · Dedemsvaart"
                  />
                </div>
                <div>
                  <label className="admin-label" htmlFor="hero-title">
                    Hoofdtitel
                  </label>
                  <textarea
                    id="hero-title"
                    className="admin-field admin-field--flush"
                    rows={2}
                    value={hero.title ?? ""}
                    onChange={(e) => heroField("title", e.target.value)}
                    placeholder="Meer dan een winkel, je sportpartner."
                  />
                </div>
                <div>
                  <label className="admin-label" htmlFor="hero-subtitle">
                    Ondertitel
                  </label>
                  <textarea
                    id="hero-subtitle"
                    className="admin-field admin-field--flush"
                    rows={3}
                    value={hero.subtitle ?? ""}
                    onChange={(e) => heroField("subtitle", e.target.value)}
                    placeholder="Korte zin onder de hoofdtitel"
                  />
                </div>
                <div>
                  <label className="admin-label" htmlFor="hero-cta-shop">
                    Knop shop
                  </label>
                  <input
                    id="hero-cta-shop"
                    className="admin-field admin-field--flush"
                    value={hero.ctaShop ?? ""}
                    onChange={(e) => heroField("ctaShop", e.target.value)}
                    placeholder="Bekijk onze producten"
                  />
                </div>
                <div>
                  <label className="admin-label" htmlFor="hero-cta-offers">
                    Knop aanbiedingen
                  </label>
                  <input
                    id="hero-cta-offers"
                    className="admin-field admin-field--flush"
                    value={hero.ctaOffers ?? ""}
                    onChange={(e) => heroField("ctaOffers", e.target.value)}
                    placeholder="Mijn verhaal"
                  />
                </div>
              </div>

              <div className="admin-panel-surface admin-stack-tight">
                <h2 className="admin-section-title">Promo-blok</h2>
                <p className="admin-muted admin-m-0">Optioneel. Leeg laten als je geen promo naast de hero wilt.</p>
                <div>
                  <label className="admin-label" htmlFor="hero-promo-label">
                    Promo-label
                  </label>
                  <input
                    id="hero-promo-label"
                    className="admin-field admin-field--flush"
                    value={hero.promoLabel ?? ""}
                    onChange={(e) => heroField("promoLabel", e.target.value)}
                  />
                </div>
                <div>
                  <label className="admin-label" htmlFor="hero-promo-title">
                    Promo-titel
                  </label>
                  <input
                    id="hero-promo-title"
                    className="admin-field admin-field--flush"
                    value={hero.promoTitle ?? ""}
                    onChange={(e) => heroField("promoTitle", e.target.value)}
                  />
                </div>
                <div>
                  <label className="admin-label" htmlFor="hero-promo-text">
                    Promo-tekst
                  </label>
                  <textarea
                    id="hero-promo-text"
                    className="admin-field admin-field--flush"
                    rows={3}
                    value={hero.promoText ?? ""}
                    onChange={(e) => heroField("promoText", e.target.value)}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="admin-panel-surface admin-stack-tight">
              <h2 className="admin-section-title">Inhoud</h2>
              <p className="admin-muted admin-m-0">
                Dit is de tekst die bezoekers op de pagina zien. Koppen, vet, lijsten, links en foto’s.
              </p>
              <AdminHtmlEditor
                minHeight="tall"
                placeholder="Schrijf de paginatekst…"
                value={bodyHtml}
                onChange={setBodyHtml}
                imageFolder="pages"
                onImageError={setError}
              />
            </div>
          )}
        </div>

        <aside className="admin-product-editor-side" aria-label="Publicatie, uitgelichte afbeelding en SEO">
          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">Publicatie</h2>
            <label className="admin-check-highlight">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              Gepubliceerd
            </label>
            <p className="admin-muted admin-m-0">
              {isPublished
                ? isHome
                  ? "Zichtbaar op de homepage."
                  : `Zichtbaar op ${publicPath || "de site"}.`
                : "Concept: alleen zichtbaar in het admin."}
            </p>
            <div>
              <label className="admin-label" htmlFor="page-slug">
                Pad / slug
              </label>
              {page ? (
                <>
                  <input id="page-slug" className="admin-field admin-field--flush" value={page.slug} readOnly />
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
                </>
              ) : (
                <>
                  <input
                    id="page-slug"
                    className="admin-field admin-field--flush"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="wordt automatisch uit de titel gezet"
                  />
                  <p className="admin-muted admin-m-0 admin-mt-05">
                    {publicPath ? (
                      <>
                        Wordt <code>{publicPath}</code>
                      </>
                    ) : (
                      "Slug volgt automatisch uit de titel als je dit leeg laat."
                    )}
                  </p>
                </>
              )}
            </div>
          </div>

          <AdminFeaturedImagePanel
            image={socialImage}
            alt={imageAlt}
            onImageChange={setSocialImage}
            onAltChange={setImageAlt}
            onError={setError}
            folder="pages"
            urlId="page-social-image"
            altId="page-image-alt"
            hint={
              isHome
                ? "Voor delen op social media (Open Graph). De hero op de homepage heeft eigen beeld."
                : "Deze foto staat bovenaan de pagina en bij delen op social media. Foto’s in de tekst voeg je in de editor in."
            }
          />

          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">SEO &amp; social</h2>
            <p className="admin-muted admin-m-0">Optioneel. Leeg = titel van de pagina.</p>
            <div>
              <label className="admin-label" htmlFor="page-seo-title">
                SEO-titel
              </label>
              <input
                id="page-seo-title"
                className="admin-field admin-field--flush"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="page-seo-desc">
                Meta description
              </label>
              <textarea
                id="page-seo-desc"
                className="admin-field admin-field--flush"
                rows={3}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="page-og-title">
                Open Graph titel
              </label>
              <input
                id="page-og-title"
                className="admin-field admin-field--flush"
                value={ogTitle}
                onChange={(e) => setOgTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="page-og-desc">
                Open Graph tekst
              </label>
              <textarea
                id="page-og-desc"
                className="admin-field admin-field--flush"
                rows={2}
                value={ogDescription}
                onChange={(e) => setOgDescription(e.target.value)}
              />
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
            {isHome ? " · Homepage" : ""}
            {publicPath ? ` · ${publicPath}` : ""}
          </span>
          {renderSaveActions()}
        </div>
      </div>
    </div>
  );
}
