"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatRalexCategoryName, type RalexCategoryNode } from "@/lib/ralex-categories";
import {
  AI_IMAGE_TEMPLATES,
  buildPromptFromTemplate,
} from "@/lib/ai-image-templates";
import {
  buildDimensionLine,
  DEFAULT_AI_INCLUDE_FLAGS,
  emptyAiImageOverlayValues,
  parseProductAiImageOverlay,
  type AiImageIncludeFlags,
  type AiImageOverlayValues,
  type ParsedAiProductOverlay,
} from "@/lib/ai-image-overlay";
import type { TrendyolJsonProduct } from "@/lib/products";
import { resolveTemplateIdForCategorySlug } from "@/lib/ai-image-template-mappings";

const adminFetchInit: RequestInit = { credentials: "include", cache: "no-store" };

type ShopCategoryOption = { slug: string; label: string; depth: number; count: number };

function flattenShopCategoryOptions(nodes: RalexCategoryNode[], depth = 0): ShopCategoryOption[] {
  const out: ShopCategoryOption[] = [];
  for (const node of nodes) {
    out.push({
      slug: node.slug,
      label: formatRalexCategoryName(node.name),
      depth,
      count: node.count,
    });
    if (node.children?.length) out.push(...flattenShopCategoryOptions(node.children, depth + 1));
  }
  return out;
}

function categoryOptionLabel(opt: ShopCategoryOption): string {
  const indent = opt.depth > 0 ? `${"—".repeat(opt.depth)} ` : "";
  return `${indent}${opt.label}${opt.count > 0 ? ` (${opt.count})` : ""}`;
}

type CatalogProductRow = {
  id: number;
  name: string;
  category: string;
  image: string;
  overlay: ParsedAiProductOverlay;
  parseNotes: string[];
};

function overlayFromParsed(parsed: ParsedAiProductOverlay): AiImageOverlayValues {
  return {
    setQuantity: parsed.setQuantity,
    productTitleRo: parsed.productTitleRo,
    widthCm: parsed.widthCm,
    heightCm: parsed.heightCm,
    thicknessCm: parsed.thicknessCm,
    dimensionLine: parsed.dimensionLine,
    sizeOptions: parsed.sizeOptions,
  };
}

function StepHead({ n, title, done }: { n: number; title: string; done?: boolean }) {
  return (
    <div className="admin-ai-step-head">
      <span className={`admin-ai-step-num${done ? " admin-ai-step-num--done" : ""}`}>{n}</span>
      <span className="admin-ai-step-title">{title}</span>
    </div>
  );
}

export default function AdminAiImagesPanel() {
  const defaultTemplate = AI_IMAGE_TEMPLATES[0]!;
  const [selectedId, setSelectedId] = useState(defaultTemplate.id);
  const [overlay, setOverlay] = useState<AiImageOverlayValues>(emptyAiImageOverlayValues);
  const [include, setInclude] = useState<AiImageIncludeFlags>({ ...DEFAULT_AI_INCLUDE_FLAGS });
  const [overlayExtraText, setOverlayExtraText] = useState("");
  const [parseNotes, setParseNotes] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [lastLibraryUrl, setLastLibraryUrl] = useState<string | null>(null);

  const [shopCategories, setShopCategories] = useState<ShopCategoryOption[]>([]);
  const [categoryTree, setCategoryTree] = useState<RalexCategoryNode[]>([]);
  const [templateMappings, setTemplateMappings] = useState<Record<string, string>>({});
  const [autoMappedTemplate, setAutoMappedTemplate] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [shopCategorySlug, setShopCategorySlug] = useState("");

  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<CatalogProductRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: number; name: string } | null>(null);

  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [sourceIsUpload, setSourceIsUpload] = useState(false);

  const [openAiOk, setOpenAiOk] = useState<boolean | null>(null);

  const template = useMemo(
    () => AI_IMAGE_TEMPLATES.find((t) => t.id === selectedId) ?? defaultTemplate,
    [selectedId, defaultTemplate],
  );

  const shopCategoryLabel = useMemo(
    () => shopCategories.find((c) => c.slug === shopCategorySlug)?.label ?? null,
    [shopCategories, shopCategorySlug],
  );

  const dimDisplay = useMemo(() => buildDimensionLine(overlay), [overlay]);

  const step1Done = Boolean(shopCategorySlug && selectedId);
  const step2Done = Boolean(sourcePreview);
  const step3Ready = step1Done && step2Done;

  const prompt = useMemo(
    () =>
      buildPromptFromTemplate(template, {
        overlay,
        include,
        referenceImageUrl: template.referenceImageUrl,
        sourceImageUrl: sourcePreview,
        sourceProductName: selectedProduct?.name,
        overlayExtraText: include.catalogExtras ? overlayExtraText : undefined,
      }),
    [template, overlay, include, sourcePreview, selectedProduct?.name, overlayExtraText],
  );

  const overlayPreview = useMemo(() => {
    const lines: string[] = [];
    if (include.setQuantity && overlay.setQuantity != null) {
      lines.push(`SET ${overlay.setQuantity}`);
    }
    if (include.productTitle && overlay.productTitleRo) {
      lines.push(overlay.productTitleRo);
    }
    if (include.dimensions && dimDisplay) {
      lines.push(dimDisplay);
    }
    if (include.madeInRomania) {
      lines.push("FABRICAT ÎN ROMÂNIA");
    }
    return lines;
  }, [overlay, include, dimDisplay]);

  const searchCatalog = useCallback(
    async (q: string, category: string) => {
      if (!category) {
        setCatalogResults([]);
        return;
      }
      setCatalogLoading(true);
      try {
        const params = new URLSearchParams({ category, templateId: selectedId, limit: "20" });
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(`/api/admin/ai-images/ralex-products?${params}`, adminFetchInit);
        const data = (await res.json()) as { products?: CatalogProductRow[] };
        setCatalogResults(res.ok ? (data.products ?? []) : []);
      } catch {
        setCatalogResults([]);
      } finally {
        setCatalogLoading(false);
      }
    },
    [selectedId],
  );

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/ai-image-status", adminFetchInit);
        const data = (await res.json()) as { ok?: boolean };
        setOpenAiOk(Boolean(data.ok));
      } catch {
        setOpenAiOk(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      setCategoriesLoading(true);
      try {
        const res = await fetch("/api/admin/ai-images/template-mappings", adminFetchInit);
        const data = (await res.json()) as {
          categoryTree?: RalexCategoryNode[];
          mappings?: Record<string, string>;
        };
        if (res.ok && data.categoryTree?.length) {
          setCategoryTree(data.categoryTree);
          setShopCategories(flattenShopCategoryOptions(data.categoryTree));
        }
        if (res.ok && data.mappings) setTemplateMappings(data.mappings);
      } finally {
        setCategoriesLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void searchCatalog(catalogQuery, shopCategorySlug), 280);
    return () => window.clearTimeout(t);
  }, [catalogQuery, shopCategorySlug, searchCatalog]);

  const clearUpload = () => {
    if (sourceIsUpload && sourcePreview) URL.revokeObjectURL(sourcePreview);
  };

  const applyProductOverlay = (parsed: ParsedAiProductOverlay) => {
    setOverlay(overlayFromParsed(parsed));
    setParseNotes(parsed.parseNotes);
    setOverlayExtraText(parsed.overlayExtraText ?? "");
    setInclude((prev) => ({
      ...prev,
      setQuantity: parsed.setQuantity != null,
      dimensions: Boolean(parsed.dimensionLine || parsed.widthCm != null || parsed.sizeOptions.length),
      catalogExtras: Boolean(parsed.overlayExtraText),
    }));
  };

  const selectProduct = (row: CatalogProductRow) => {
    clearUpload();
    setSelectedProduct({ id: row.id, name: row.name });
    setSourcePreview(row.image);
    setSourceIsUpload(false);
    applyProductOverlay(row.overlay);
    void (async () => {
      try {
        const res = await fetch(`/api/admin/products/${row.id}`, adminFetchInit);
        if (!res.ok) return;
        const full = (await res.json()) as TrendyolJsonProduct;
        const reparsed = parseProductAiImageOverlay(full);
        applyProductOverlay(reparsed);
      } catch {
        /* list overlay is enough */
      }
    })();
  };

  const onShopCategoryChange = (slug: string) => {
    const opt = shopCategories.find((c) => c.slug === slug);
    setShopCategorySlug(slug);
    setSelectedProduct(null);
    clearUpload();
    setSourcePreview(null);
    setSourceIsUpload(false);
    setParseNotes([]);
    setOverlayExtraText("");
    setOverlay(
      opt
        ? { ...emptyAiImageOverlayValues(), productTitleRo: opt.label.toUpperCase() }
        : emptyAiImageOverlayValues(),
    );

    if (slug) {
      const tid = resolveTemplateIdForCategorySlug(templateMappings, categoryTree, slug);
      const next = tid ? AI_IMAGE_TEMPLATES.find((t) => t.id === tid) : null;
      if (next) {
        setSelectedId(next.id);
        setAutoMappedTemplate(next.name);
      } else {
        setAutoMappedTemplate(null);
      }
    } else {
      setAutoMappedTemplate(null);
    }
  };

  const patchOverlay = <K extends keyof AiImageOverlayValues>(key: K, value: AiImageOverlayValues[K]) => {
    setOverlay((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "widthCm" || key === "heightCm" || key === "thicknessCm" || key === "dimensionLine") {
        next.dimensionLine = buildDimensionLine(next);
      }
      return next;
    });
  };

  const toggleInclude = (key: keyof AiImageIncludeFlags) => {
    setInclude((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = async () => {
    if (!sourcePreview || openAiOk === false) return;
    setGenerating(true);
    setGenError(null);
    setLastLibraryUrl(null);
    try {
      const res = await fetch("/api/admin/ai-images/generate", {
        ...adminFetchInit,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedId,
          sourceImageUrl: sourcePreview,
          referenceImageUrl: template.referenceImageUrl,
          overlay,
          include,
          overlayExtraText: include.catalogExtras ? overlayExtraText : undefined,
          productId: selectedProduct?.id ?? null,
          productName: selectedProduct?.name ?? null,
          shopCategorySlug: shopCategorySlug || null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; libraryUrl?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      if (data.libraryUrl) setLastLibraryUrl(data.libraryUrl);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const canGenerate = step3Ready && openAiOk !== false && Boolean(sourcePreview);

  return (
    <div className="admin-ai-wizard">
      {openAiOk === false ? (
        <div className="admin-banner warn admin-m-0">
          Zet OPENAI_API_KEY onder Instellingen → OpenAI (sk-… + Opslaan) om te genereren.
        </div>
      ) : null}

      {/* Step 1 */}
      <section className="admin-panel admin-ai-wizard-step">
        <StepHead n={1} title="Category & template" done={step1Done} />
        <div className="admin-ai-step-grid">
          <div className="admin-field">
            <label className="admin-label" htmlFor="ai-shop-category">
              Shop category
            </label>
            <select
              id="ai-shop-category"
              className="admin-input"
              value={shopCategorySlug}
              disabled={categoriesLoading}
              onChange={(e) => onShopCategoryChange(e.target.value)}
            >
              <option value="">{categoriesLoading ? "Loading…" : "Select category"}</option>
              {shopCategories.map((opt) => (
                <option key={opt.slug} value={opt.slug}>
                  {categoryOptionLabel(opt)}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="ai-template">
              Template
            </label>
            <select
              id="ai-template"
              className="admin-input"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setAutoMappedTemplate(null);
              }}
            >
              {AI_IMAGE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {autoMappedTemplate ? (
          <p className="admin-ai-step-hint">
            Mapped: {autoMappedTemplate}.{" "}
            <Link href="/admin/ai-images/templates" className="admin-link-action">
              Edit
            </Link>
          </p>
        ) : shopCategorySlug ? (
          <p className="admin-ai-step-hint">
            <Link href="/admin/ai-images/templates" className="admin-link-action">
              Map template
            </Link>{" "}
            for this category.
          </p>
        ) : null}
      </section>

      {/* Step 2 */}
      <section className="admin-panel admin-ai-wizard-step">
        <StepHead n={2} title="Source product" done={step2Done} />
        <div className="admin-ai-step-grid admin-ai-step-grid--product">
          <div className="admin-field">
            <label className="admin-label" htmlFor="ai-search">
              Search
            </label>
            <input
              id="ai-search"
              type="search"
              className="admin-input"
              placeholder="Name, SKU…"
              value={catalogQuery}
              disabled={!shopCategorySlug}
              onChange={(e) => setCatalogQuery(e.target.value)}
            />
          </div>
          <div className="admin-field admin-ai-upload-field">
            <span className="admin-label">Or upload</span>
            <label className="admin-btn-secondary admin-ai-upload-label admin-ai-upload-compact">
              Image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="admin-ai-upload-input"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  clearUpload();
                  setSelectedProduct(null);
                  setParseNotes([]);
                  if (!file) {
                    setSourcePreview(null);
                    setSourceIsUpload(false);
                    return;
                  }
                  setSourcePreview(URL.createObjectURL(file));
                  setSourceIsUpload(true);
                  setOverlay(emptyAiImageOverlayValues());
                }}
              />
            </label>
          </div>
        </div>

        {!shopCategorySlug ? (
          <p className="admin-muted admin-m-0">Complete step 1 first.</p>
        ) : catalogLoading ? (
          <p className="admin-muted admin-m-0">Loading…</p>
        ) : (
          <ul className="admin-ai-catalog-list admin-ai-catalog-list--compact">
            {catalogResults.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className={`admin-ai-catalog-item${selectedProduct?.id === row.id ? " admin-ai-catalog-item--active" : ""}`}
                  onClick={() => selectProduct(row)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.image} alt="" className="admin-ai-catalog-thumb" />
                  <span className="admin-ai-catalog-name">{row.name}</span>
                  {row.parseNotes[0] ? (
                    <span className="admin-ai-catalog-hint">{row.parseNotes[0]}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedProduct ? (
          <p className="admin-ai-step-hint">
            <Link href={`/admin/products/${selectedProduct.id}`} className="admin-link-action">
              {selectedProduct.name}
            </Link>
          </p>
        ) : null}
      </section>

      {/* Step 3 — compare + overlay */}
      <section className="admin-panel admin-ai-wizard-step">
        <StepHead n={3} title="Preview & overlay" done={step3Ready} />

        <div className="admin-ai-compare">
          <div className="admin-ai-compare-col">
            <span className="admin-ai-compare-label">Template (fixed)</span>
            <div className="admin-ai-compare-frame">
              <Image
                src={template.referenceImageUrl}
                alt="Template"
                width={600}
                height={600}
                className="admin-ai-images-img"
                sizes="50vw"
              />
            </div>
          </div>
          <div className="admin-ai-compare-col">
            <span className="admin-ai-compare-label">Source product</span>
            <div className="admin-ai-compare-frame">
              {sourcePreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={sourcePreview} alt="Source" className="admin-ai-images-img" />
              ) : (
                <div className="admin-ai-compare-empty">Select product or upload</div>
              )}
            </div>
          </div>
        </div>

        {parseNotes.length > 0 ? (
          <p className="admin-ai-step-hint">From product: {parseNotes.join(" · ")}</p>
        ) : null}

        <div className="admin-ai-include">
          <span className="admin-label admin-block admin-mb-05">Include in generated image</span>
          <div className="admin-ai-include-grid">
            <label className="admin-ai-check">
              <input
                type="checkbox"
                checked={include.setQuantity}
                disabled={overlay.setQuantity == null}
                onChange={() => toggleInclude("setQuantity")}
              />
              SET {overlay.setQuantity != null ? overlay.setQuantity : "—"}
            </label>
            <label className="admin-ai-check">
              <input type="checkbox" checked={include.productTitle} onChange={() => toggleInclude("productTitle")} />
              Title
            </label>
            <label className="admin-ai-check">
              <input
                type="checkbox"
                checked={include.dimensions}
                disabled={!dimDisplay}
                onChange={() => toggleInclude("dimensions")}
              />
              Dimensions / sizes
            </label>
            <label className="admin-ai-check">
              <input type="checkbox" checked={include.madeInRomania} onChange={() => toggleInclude("madeInRomania")} />
              Made in Romania
            </label>
            <label className="admin-ai-check">
              <input type="checkbox" checked={include.catalogExtras} onChange={() => toggleInclude("catalogExtras")} />
              Catalog description
            </label>
          </div>
        </div>

        {overlay.sizeOptions.length > 0 ? (
          <p className="admin-ai-variations">
            Variations: <strong>{overlay.sizeOptions.join(" · ")}</strong>
          </p>
        ) : null}

        <div className="admin-ai-overlay-fields">
          {include.setQuantity && overlay.setQuantity != null ? (
            <div className="admin-field admin-field--compact">
              <label className="admin-label" htmlFor="ai-set">
                SET
              </label>
              <input
                id="ai-set"
                type="number"
                min={1}
                className="admin-input"
                value={overlay.setQuantity}
                onChange={(e) => patchOverlay("setQuantity", Number(e.target.value) || null)}
              />
            </div>
          ) : null}
          {include.productTitle ? (
            <div className="admin-field admin-field--compact admin-field--grow">
              <label className="admin-label" htmlFor="ai-title">
                Title (RO)
              </label>
              <input
                id="ai-title"
                className="admin-input"
                value={overlay.productTitleRo}
                onChange={(e) => patchOverlay("productTitleRo", e.target.value)}
              />
            </div>
          ) : null}
          {include.dimensions ? (
            <>
              {overlay.sizeOptions.length > 0 && overlay.widthCm == null ? (
                <div className="admin-field admin-field--compact admin-field--grow">
                  <label className="admin-label" htmlFor="ai-dim-line">
                    Sizes / specs (overlay)
                  </label>
                  <input
                    id="ai-dim-line"
                    className="admin-input"
                    value={overlay.dimensionLine}
                    onChange={(e) => patchOverlay("dimensionLine", e.target.value)}
                    placeholder="e.g. XL · XXL"
                  />
                </div>
              ) : (
                <>
                  <div className="admin-field admin-field--compact">
                    <label className="admin-label">W (cm)</label>
                    <input
                      type="number"
                      className="admin-input"
                      value={overlay.widthCm ?? ""}
                      placeholder="—"
                      onChange={(e) =>
                        patchOverlay("widthCm", e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </div>
                  <div className="admin-field admin-field--compact">
                    <label className="admin-label">H (cm)</label>
                    <input
                      type="number"
                      className="admin-input"
                      value={overlay.heightCm ?? ""}
                      placeholder="—"
                      onChange={(e) =>
                        patchOverlay("heightCm", e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </div>
                  <div className="admin-field admin-field--compact">
                    <label className="admin-label">Thick.</label>
                    <input
                      type="number"
                      className="admin-input"
                      value={overlay.thicknessCm ?? ""}
                      placeholder="—"
                      onChange={(e) =>
                        patchOverlay("thicknessCm", e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </div>
                </>
              )}
            </>
          ) : null}
          {include.catalogExtras ? (
            <div className="admin-field admin-field--compact admin-field--grow">
              <label className="admin-label" htmlFor="ai-extra">
                Extra text
              </label>
              <input
                id="ai-extra"
                className="admin-input"
                value={overlayExtraText}
                onChange={(e) => setOverlayExtraText(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        {overlayPreview.length > 0 ? (
          <div className="admin-ai-overlay-preview-chip">
            {overlayPreview.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        ) : null}
      </section>

      {/* Step 4 */}
      <section className="admin-panel admin-ai-wizard-step">
        <StepHead n={4} title="Generate" done={Boolean(lastLibraryUrl)} />
        {genError ? (
          <div className="admin-banner err admin-m-0 admin-mb-05" role="alert">
            {genError}
          </div>
        ) : null}
        {lastLibraryUrl ? (
          <div className="admin-banner ok admin-m-0 admin-mb-05" role="status">
            Image saved.{" "}
            <Link href={lastLibraryUrl} className="admin-link-action">
              Open in library →
            </Link>
          </div>
        ) : null}
        <div className="admin-form-actions admin-m-0 admin-ai-generate-row">
          <button
            type="button"
            className="admin-btn-primary"
            disabled={!canGenerate || generating}
            title={
              !canGenerate
                ? "Complete steps 1–3 and configure OPENAI_API_KEY"
                : sourceIsUpload
                  ? "Upload works for preview; pick a catalog product to install as main image later"
                  : undefined
            }
            onClick={() => void handleGenerate()}
          >
            {generating ? "Generating…" : "Generate image"}
          </button>
          <Link href="/admin/ai-images/library" className="admin-link-action">
            Generated images
          </Link>
        </div>
        {sourceIsUpload ? (
          <p className="admin-muted admin-ai-step-hint admin-m-0">
            Uploaded source only — select a catalog product in step 2 to install the result as main photo.
          </p>
        ) : null}
        <div className="admin-ai-prompt-block">
          <span className="admin-label admin-ai-prompt-label">Prompt preview</span>
          <pre className="admin-ai-prompt">{prompt}</pre>
        </div>
      </section>
    </div>
  );
}
