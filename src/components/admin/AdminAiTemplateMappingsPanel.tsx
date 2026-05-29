"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatRalexCategoryName, type RalexCategoryNode } from "@/lib/ralex-categories";
import { resolveTemplateIdForCategorySlug } from "@/lib/ai-image-template-mappings";

const adminFetchInit: RequestInit = { credentials: "include", cache: "no-store" };

type TemplateOption = {
  id: string;
  name: string;
  referenceImageUrl: string;
};

type CategoryOption = {
  slug: string;
  label: string;
  depth: number;
};

function flattenCategoryOptions(nodes: RalexCategoryNode[], depth = 0): CategoryOption[] {
  const out: CategoryOption[] = [];
  for (const node of nodes) {
    out.push({
      slug: node.slug,
      label: formatRalexCategoryName(node.name),
      depth,
    });
    if (node.children?.length) {
      out.push(...flattenCategoryOptions(node.children, depth + 1));
    }
  }
  return out;
}

function categoryLabel(opt: CategoryOption): string {
  const indent = opt.depth > 0 ? `${"—".repeat(opt.depth)} ` : "";
  return `${indent}${opt.label}`;
}

export default function AdminAiTemplateMappingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [categoryTree, setCategoryTree] = useState<RalexCategoryNode[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});

  const [addCategorySlug, setAddCategorySlug] = useState("");
  const [addTemplateId, setAddTemplateId] = useState("");

  const categories = useMemo(() => flattenCategoryOptions(categoryTree), [categoryTree]);

  const templateById = useMemo(() => {
    const m = new Map<string, TemplateOption>();
    for (const t of templates) {
      m.set(t.id, t);
    }
    return m;
  }, [templates]);

  const mappingRows = useMemo(() => {
    return Object.entries(mappings)
      .map(([slug, templateId]) => {
        const cat = categories.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
        const tpl = templateById.get(templateId);
        return {
          slug,
          templateId,
          categoryLabel: cat?.label ?? slug,
          templateName: tpl?.name ?? templateId,
          referenceImageUrl: tpl?.referenceImageUrl,
        };
      })
      .sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel, "ro"));
  }, [mappings, categories, templateById]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-images/template-mappings", adminFetchInit);
      const data = (await res.json()) as {
        mappings?: Record<string, string>;
        templates?: TemplateOption[];
        categoryTree?: RalexCategoryNode[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load");
      }
      setMappings(data.mappings ?? {});
      setTemplates(data.templates ?? []);
      setCategoryTree(data.categoryTree ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (templates.length > 0 && !addTemplateId) {
      setAddTemplateId(templates[0]!.id);
    }
  }, [templates, addTemplateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/admin/ai-images/template-mappings", {
        ...adminFetchInit,
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings }),
      });
      const data = (await res.json()) as { error?: string; mappings?: Record<string, string> };
      if (!res.ok) {
        throw new Error(data.error ?? "Save failed");
      }
      setMappings(data.mappings ?? mappings);
      setSaveMsg("Mappings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addMapping = () => {
    const slug = addCategorySlug.trim().toLowerCase();
    const templateId = addTemplateId.trim();
    if (!slug || !templateId) {
      return;
    }
    setMappings((prev) => ({ ...prev, [slug]: templateId }));
    setAddCategorySlug("");
    setSaveMsg(null);
  };

  const removeMapping = (slug: string) => {
    setMappings((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
    setSaveMsg(null);
  };

  const updateRowTemplate = (slug: string, templateId: string) => {
    setMappings((prev) => ({ ...prev, [slug]: templateId }));
    setSaveMsg(null);
  };

  return (
    <div className="admin-stack">
      <div className="admin-panel admin-stack-tight">
        <h2 className="admin-panel-title">Category → template mapping</h2>
        <p className="admin-muted admin-m-0">
          When you pick a shop category on{" "}
          <Link href="/admin/ai-images" className="admin-link-action">
            Generate
          </Link>
          , the mapped template is selected automatically. Child categories inherit a parent mapping if they
          have no own mapping.
        </p>

        {loading ? <p className="admin-muted admin-m-0">Loading…</p> : null}
        {error ? (
          <div className="admin-banner err admin-m-0" role="alert">
            {error}
          </div>
        ) : null}
        {saveMsg ? (
          <div className="admin-banner ok admin-m-0" role="status">
            {saveMsg}
          </div>
        ) : null}

        {!loading ? (
          <>
            <div className="admin-form-grid admin-ai-images-form admin-mt-05">
              <div className="admin-field admin-span-2">
                <label className="admin-label" htmlFor="map-category">
                  Shop category
                </label>
                <select
                  id="map-category"
                  className="admin-input"
                  value={addCategorySlug}
                  onChange={(e) => setAddCategorySlug(e.target.value)}
                >
                  <option value="">— Select category —</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {categoryLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field admin-span-2">
                <label className="admin-label" htmlFor="map-template">
                  Template
                </label>
                <select
                  id="map-template"
                  className="admin-input"
                  value={addTemplateId}
                  onChange={(e) => setAddTemplateId(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field admin-ai-map-actions">
                <button type="button" className="admin-btn-secondary" onClick={addMapping}>
                  Add mapping
                </button>
              </div>
            </div>

            {mappingRows.length === 0 ? (
              <p className="admin-muted admin-m-0">No mappings yet. Add a category and template above.</p>
            ) : (
              <ul className="admin-ai-map-list">
                {mappingRows.map((row) => (
                  <li key={row.slug} className="admin-ai-map-row">
                    <div className="admin-ai-map-row-main">
                      <div className="admin-ai-map-cat">
                        <span className="admin-ai-map-cat-name">{row.categoryLabel}</span>
                        <code className="admin-ai-map-slug">{row.slug}</code>
                      </div>
                      <select
                        className="admin-input admin-ai-map-template-select"
                        value={row.templateId}
                        onChange={(e) => updateRowTemplate(row.slug, e.target.value)}
                        aria-label={`Template for ${row.categoryLabel}`}
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      {row.referenceImageUrl ? (
                        <div className="admin-ai-map-thumb">
                          <Image
                            src={row.referenceImageUrl}
                            alt=""
                            width={80}
                            height={80}
                            className="admin-ai-images-img"
                          />
                        </div>
                      ) : null}
                      <button
                        type="button"
                        className="admin-btn-danger admin-ai-map-remove"
                        onClick={() => removeMapping(row.slug)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {categories.length > 0 && templates.length > 0 ? (
              <details className="admin-ai-map-inherit-hint">
                <summary className="admin-muted">Preview inheritance (no mapping)</summary>
                <ul className="admin-ai-map-inherit-list">
                  {categories
                    .filter((c) => !mappings[c.slug.toLowerCase()] && !mappings[c.slug])
                    .slice(0, 12)
                    .map((c) => {
                      const resolved = resolveTemplateIdForCategorySlug(
                        mappings,
                        categoryTree,
                        c.slug,
                      );
                      if (!resolved) {
                        return null;
                      }
                      return (
                        <li key={c.slug}>
                          {c.label} → {templateById.get(resolved)?.name ?? resolved}{" "}
                          <span className="admin-ai-map-inherit-via">(via parent)</span>
                        </li>
                      );
                    })}
                </ul>
              </details>
            ) : null}

            <div className="admin-form-actions admin-mt-05">
              <button type="button" className="admin-btn-primary" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save mappings"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
