"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import AdminHtmlEditor from "@/components/admin/AdminHtmlEditor";
import AdminLocaleTabs from "@/components/admin/AdminLocaleTabs";
import { useLocaleDraft } from "@/components/admin/useLocaleDraft";
import type { AdminCategory } from "@/lib/categories-admin";
import { hydrateCategoryTranslations } from "@/lib/i18n/hydrate";
import type { CategoryLocaleFields } from "@/lib/i18n/translations";
import { shopCategoryPath } from "@/lib/shop-category-filter";
import { slugifyNl } from "@/lib/slugify";

type FormState = {
  parentId: string;
};

const EMPTY_FORM: FormState = {
  parentId: "0",
};

function formFromCategory(category: AdminCategory): FormState {
  return {
    parentId: String(category.parentId),
  };
}

function flattenTree(categories: AdminCategory[]): { category: AdminCategory; depth: number }[] {
  const children = new Map<number, AdminCategory[]>();
  for (const category of categories) {
    const list = children.get(category.parentId) ?? [];
    list.push(category);
    children.set(category.parentId, list);
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "nl"));
  }
  const out: { category: AdminCategory; depth: number }[] = [];
  const walk = (parentId: number, depth: number) => {
    for (const category of children.get(parentId) ?? []) {
      out.push({ category, depth });
      walk(category.id, depth + 1);
    }
  };
  walk(0, 0);
  const seen = new Set(out.map((row) => row.category.id));
  for (const category of categories) {
    if (!seen.has(category.id)) {
      out.push({ category, depth: 0 });
    }
  }
  return out;
}

function descendantIds(categories: AdminCategory[], id: number): Set<number> {
  const children = new Map<number, number[]>();
  for (const category of categories) {
    const list = children.get(category.parentId) ?? [];
    list.push(category.id);
    children.set(category.parentId, list);
  }
  const out = new Set<number>();
  const walk = (current: number) => {
    for (const child of children.get(current) ?? []) {
      if (out.has(child)) continue;
      out.add(child);
      walk(child);
    }
  };
  walk(id);
  return out;
}

type Props = {
  category?: AdminCategory;
  categories: AdminCategory[];
};

export default function AdminCategoriesPanel({ category, categories }: Props) {
  const router = useRouter();
  const isNew = !category;
  const [form, setForm] = useState<FormState>(category ? formFromCategory(category) : EMPTY_FORM);
  const {
    locale: editLocale,
    setLocale: setEditLocale,
    languages,
    fields: loc,
    setField: setLoc,
    compact,
    filled,
    setMap,
  } = useLocaleDraft<CategoryLocaleFields>(
    category ? category.translations : hydrateCategoryTranslations({ name: "", slug: "" }),
  );
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rows = useMemo(() => flattenTree(categories), [categories]);
  const blockedParentIds = useMemo(() => {
    if (!category) return new Set<number>();
    const blocked = descendantIds(categories, category.id);
    blocked.add(category.id);
    return blocked;
  }, [categories, category]);

  const titlePreview = (loc.name ?? "").trim() || (isNew ? "Nieuwe categorie" : "Categorie");
  const slugPreview = useMemo(
    () => (loc.slug ?? "").trim() || slugifyNl(loc.name ?? "") || "",
    [loc.slug, loc.name],
  );
  const publicPath = slugPreview ? shopCategoryPath(slugPreview) : "";
  const busy = saving || deleting;

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function payload() {
    const translations = compact();
    const nl = translations.nl ?? loc;
    return {
      name: nl.name ?? loc.name ?? "",
      slug: nl.slug ?? loc.slug ?? "",
      parentId: Number.parseInt(form.parentId, 10) || 0,
      seoIntro: nl.description ?? "",
      seoFooterHtml: nl.seoFooterHtml ?? "",
      seoMetaTitle: nl.seoTitle ?? "",
      seoMetaDescription: nl.seoDescription ?? "",
      translations,
    };
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(isNew ? "/api/admin/shop-categories" : `/api/admin/shop-categories/${category.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const data = (await res.json()) as { category?: AdminCategory; error?: string };
      if (!res.ok || !data.category) {
        setError(data.error ?? "Opslaan mislukt");
        setSaving(false);
        return;
      }
      setForm(formFromCategory(data.category));
      setMap(data.category.translations);
      setSlugTouched(true);
      setMessage(isNew ? "Categorie aangemaakt." : "Categorie opgeslagen.");
      if (isNew) {
        router.replace(`/admin/categories/${data.category.id}`);
      }
      router.refresh();
    } catch {
      setError("Geen verbinding");
    }
    setSaving(false);
  }

  async function remove() {
    if (!category) return;
    if (category.childCount > 0) {
      setError("Verwijder eerst de subcategorieën.");
      return;
    }
    if (
      !window.confirm(
        `Categorie “${category.name}” verwijderen? Producten blijven bestaan, maar vallen niet meer in deze categorie.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/shop-categories/${category.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verwijderen mislukt");
        setDeleting(false);
        return;
      }
      router.replace("/admin/categories");
      router.refresh();
    } catch {
      setError("Geen verbinding");
      setDeleting(false);
    }
  }

  function renderSaveActions() {
    return (
      <div className="admin-form-actions">
        {!isNew ? (
          <button
            type="button"
            className="admin-btn-danger"
            disabled={busy || category.childCount > 0}
            onClick={() => void remove()}
          >
            {deleting ? "…" : "Verwijderen"}
          </button>
        ) : null}
        <button type="button" className="admin-btn-primary" disabled={busy} onClick={() => void save()}>
          {saving ? "Opslaan…" : isNew ? "Aanmaken" : "Opslaan"}
        </button>
      </div>
    );
  }

  return (
    <div className="admin-product-editor-root admin-stack">
      <div className="admin-page-head">
        <div>
          <Link href="/admin/categories" className="admin-breadcrumb">
            ← Alle categorieën
          </Link>
          <h1 className="admin-h1">{titlePreview}</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            {isNew ? (
              slugPreview ? (
                <>
                  Wordt <code>{publicPath}</code>
                </>
              ) : (
                "Slug volgt uit de naam"
              )
            ) : (
              <>
                {slugPreview ? <code>{publicPath}</code> : "Slug volgt uit de naam"}
                {publicPath ? (
                  <>
                    {" "}
                    ·{" "}
                    <a href={publicPath} target="_blank" rel="noopener noreferrer" className="admin-link-action">
                      Bekijk in shop
                    </a>
                  </>
                ) : null}
              </>
            )}
          </p>
        </div>
        <div className="admin-page-head-actions">{renderSaveActions()}</div>
      </div>

      <AdminLocaleTabs
        languages={languages}
        value={editLocale}
        onChange={setEditLocale}
        filledLocales={filled}
        hint="Naam, slug en SEO per taal. De Nederlandse slug blijft de canonieke URL; andere talen krijgen /en/… plus hun eigen slug."
      />

      {message ? (
        <div className="admin-banner ok admin-m-0" role="status">
          {message}
        </div>
      ) : null}
      {error ? <div className="admin-error-box">{error}</div> : null}

      <div className="admin-product-editor-grid">
        <div className="admin-product-editor-main">
          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">Categorie</h2>
            <div>
              <label className="admin-label" htmlFor="cat-name">
                Naam
              </label>
              <input
                id="cat-name"
                className="admin-field admin-field--flush"
                value={loc.name ?? ""}
                onChange={(e) => {
                  const name = e.target.value;
                  setLoc("name", name);
                  if (!slugTouched) setLoc("slug", slugifyNl(name));
                }}
                placeholder="Naam in de shop"
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="cat-slug">
                Slug (URL)
              </label>
              <input
                id="cat-slug"
                className="admin-field admin-field--flush"
                value={loc.slug ?? ""}
                onChange={(e) => {
                  setSlugTouched(true);
                  setLoc("slug", slugifyNl(e.target.value) || e.target.value);
                }}
                placeholder="wordt automatisch uit de naam gezet"
              />
              {publicPath ? (
                <p className="admin-muted admin-m-0 admin-mt-05">
                  <a href={publicPath} target="_blank" rel="noopener noreferrer" className="admin-link-action">
                    {publicPath}
                  </a>
                </p>
              ) : (
                <p className="admin-muted admin-m-0 admin-mt-05">
                  Slug volgt automatisch uit de naam als je dit leeg laat.
                </p>
              )}
            </div>
            <div>
              <label className="admin-label" htmlFor="cat-parent">
                Hoofdgroep
              </label>
              <select
                id="cat-parent"
                className="admin-field admin-field--flush"
                value={form.parentId}
                onChange={(e) => setField("parentId", e.target.value)}
              >
                <option value="0">— Geen (hoofdcategorie) —</option>
                {rows
                  .filter(({ category: row }) => !blockedParentIds.has(row.id))
                  .map(({ category: row, depth }) => (
                    <option key={row.id} value={row.id}>
                      {`${"— ".repeat(depth)}${row.name}`}
                    </option>
                  ))}
              </select>
              <p className="admin-muted admin-m-0 admin-mt-05">
                Optioneel. Subcategorieën hangen onder een hoofdgroep in het menu.
              </p>
            </div>
            <div>
              <label className="admin-label" htmlFor="cat-intro">
                Introtekst
              </label>
              <textarea
                id="cat-intro"
                className="admin-field admin-field--flush"
                rows={4}
                value={loc.description ?? ""}
                onChange={(e) => setLoc("description", e.target.value)}
                placeholder="Korte tekst boven de productlijst"
              />
              <p className="admin-muted admin-m-0 admin-mt-05">
                Dit is de intro op de categoriepagina. Gewone tekst, geen HTML.
              </p>
            </div>
          </div>
        </div>

        <aside className="admin-product-editor-side" aria-label="SEO en extra tekst">
          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">SEO</h2>
            <p className="admin-muted admin-m-0">Optioneel. Leeg = naam van de categorie.</p>
            <div>
              <label className="admin-label" htmlFor="cat-seo-title">
                Meta-titel
              </label>
              <input
                id="cat-seo-title"
                className="admin-field admin-field--flush"
                value={loc.seoTitle ?? ""}
                onChange={(e) => setLoc("seoTitle", e.target.value)}
                maxLength={120}
                placeholder="SEO-titel in Google"
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="cat-seo-desc">
                Meta-beschrijving
              </label>
              <textarea
                id="cat-seo-desc"
                className="admin-field admin-field--flush"
                rows={3}
                value={loc.seoDescription ?? ""}
                onChange={(e) => setLoc("seoDescription", e.target.value)}
                maxLength={320}
                placeholder="Korte beschrijving voor zoekresultaten"
              />
            </div>
          </div>

          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">Extra tekst onderaan</h2>
            <p className="admin-muted admin-m-0">
              Optioneel. Komt onder de productlijst: extra uitleg, links of een korte lijst.
            </p>
            <AdminHtmlEditor
              key={category?.id ?? "new"}
              id="cat-footer"
              minHeight="compact"
              placeholder="Optioneel: extra uitleg, links of een korte lijst onderaan de categorie."
              value={loc.seoFooterHtml ?? ""}
              onChange={(html) => setLoc("seoFooterHtml", html)}
              imageFolder="uploads"
              onImageError={setError}
            />
          </div>
        </aside>
      </div>

      <div className="admin-editor-sticky">
        <div className="admin-editor-sticky-inner">
          <span className="admin-muted" style={{ fontSize: "0.8rem" }}>
            {isNew ? "Nieuwe categorie" : titlePreview}
            {slugPreview ? ` · ${publicPath}` : ""}
          </span>
          {renderSaveActions()}
        </div>
      </div>
    </div>
  );
}
