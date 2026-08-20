"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import AdminHtmlEditor from "@/components/admin/AdminHtmlEditor";
import AdminImageUploadButton from "@/components/admin/AdminImageUploadButton";
import AdminLocaleTabs from "@/components/admin/AdminLocaleTabs";
import AdminMoneyInput from "@/components/admin/AdminMoneyInput";
import { useLocaleDraft } from "@/components/admin/useLocaleDraft";
import type { ShopBrand } from "@/lib/brands-shared";
import { dutchLabelFromImportedName } from "@/lib/category-meta";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale-codes";
import type { ProductLocaleFields } from "@/lib/i18n/translations";
import { formatMoneyInput, roundMoney } from "@/lib/money-input";
import { parseSpecEntries, specEntriesToText } from "@/lib/product-specs";
import { productPath, slugifyProductTitle } from "@/lib/product-slug";
import {
  CATALOG_SOURCES,
  decodeImportedProductTitle,
  formatProductPrice,
  hydrateProductTranslations,
  normalizeCatalogSource,
  type CatalogSource,
  type TrendyolJsonProduct,
  type WcVariationJson,
} from "@/lib/products";
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABEL, normalizeProductStatus, type ProductStatus } from "@/lib/product-status";
import { productAvailableStock } from "@/lib/stock";

function isPreviewableImageUrl(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  if (t.startsWith("/")) return true;
  return /^https?:\/\//i.test(t);
}

function stringifyOptionalJson(value: unknown): string {
  if (value == null) {
    return "";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function parseOptionalJson<T>(raw: string): T | undefined {
  const t = raw.trim();
  if (!t) {
    return undefined;
  }
  return JSON.parse(t) as T;
}

function uniqueImages(main: string, extras: string[] | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [main, ...(extras ?? [])]) {
    const url = raw.trim();
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

function mergeImageUrls(existing: string[], rawPaste: string): string[] {
  const set = new Set(existing.map((x) => x.trim().toLowerCase()));
  const merged = [...existing];
  for (const part of rawPaste.split(/[\n\r,]+/).map((s) => s.trim()).filter(Boolean)) {
    if (!isPreviewableImageUrl(part)) continue;
    const key = part.toLowerCase();
    if (set.has(key)) continue;
    set.add(key);
    merged.push(part);
  }
  return merged;
}

type SpecRow = { key: string; name: string; value: string };

function parseSpecRows(text: string): SpecRow[] {
  return parseSpecEntries(text).map((row, index) => ({ key: `spec-${index}`, ...row }));
}

function specRowsToText(rows: SpecRow[]): string {
  return specEntriesToText(rows);
}

function splitVariantLabel(label: string): { maat: string; kleur: string } {
  const parts = label.split(" / ").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { maat: parts[0] ?? "", kleur: parts.slice(1).join(" / ") };
  }
  return { maat: parts[0] ?? "", kleur: "" };
}

function joinVariantLabel(maat: string, kleur: string): string {
  const size = maat.trim();
  const color = kleur.trim();
  if (size && color) return `${size} / ${color}`;
  return size || color;
}

function nextVariationId(rows: WcVariationJson[]): number {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

type CategoryOption = { slug: string; name: string; group?: string };

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="admin-panel admin-stack-tight">
      <h2 className="admin-h2 admin-m-0">{title}</h2>
      {hint ? <p className="admin-muted admin-m-0">{hint}</p> : null}
      {children}
    </section>
  );
}

function Fold({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <details className="admin-panel admin-stack-tight">
      <summary className="admin-section-summary">{title}</summary>
      {hint ? <p className="admin-muted admin-m-0">{hint}</p> : null}
      {children}
    </details>
  );
}

type ProductEditorFormProps = {
  initial: TrendyolJsonProduct;
  categoryOptions?: CategoryOption[];
  brandOptions?: ShopBrand[];
};

export default function ProductEditorForm({
  initial,
  categoryOptions = [],
  brandOptions = [],
}: ProductEditorFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [normalizingImage, setNormalizingImage] = useState(false);
  const [normalizeMsg, setNormalizeMsg] = useState("");

  const [id] = useState(initial.id);
  const {
    locale: editLocale,
    setLocale: setEditLocale,
    languages,
    defaultLocale,
    fields: loc,
    setField: setLoc,
    compact: compactTranslations,
    filled,
  } = useLocaleDraft<ProductLocaleFields>(hydrateProductTranslations(initial));
  const name = loc.name ?? "";
  const shopSlugPreview = (loc.slug || "").trim() || slugifyProductTitle(name) || initial.slug || `product-${id}`;
  const [brandId, setBrandId] = useState(
    typeof initial.brandId === "number" && initial.brandId > 0 ? initial.brandId : 0,
  );
  const [brand, setBrand] = useState(initial.brand ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [url, setUrl] = useState(initial.url);
  const [images, setImages] = useState<string[]>(() => uniqueImages(initial.image, initial.images));
  const [currency, setCurrency] = useState(initial.currency ?? "EUR");
  const [priceCurrent, setPriceCurrent] = useState(() => formatMoneyInput(initial.priceCurrent ?? 0));
  const [priceDiscounted, setPriceDiscounted] = useState(() => formatMoneyInput(initial.priceDiscounted ?? 0));
  const [priceOld, setPriceOld] = useState(() => formatMoneyInput(initial.priceOld ?? 0));
  const [discountName, setDiscountName] = useState(
    typeof initial.discount === "object" && initial.discount && "discountName" in initial.discount
      ? String((initial.discount as { discountName?: string }).discountName ?? "")
      : "",
  );
  const [freeCargo, setFreeCargo] = useState(Boolean(initial.freeCargo));
  const [sameDayShipping, setSameDayShipping] = useState(Boolean(initial.sameDayShipping));
  const [hasFastDeliveryTag, setHasFastDeliveryTag] = useState(Boolean(initial.hasFastDeliveryTag));
  const [hasFlashSaleTag, setHasFlashSaleTag] = useState(Boolean(initial.hasFlashSaleTag));
  const [socialProofText, setSocialProofText] = useState(
    typeof initial.socialProof === "string" ? initial.socialProof : "",
  );
  const [landingJson, setLandingJson] = useState(stringifyOptionalJson(initial.landingPromo));
  const [bundleJson, setBundleJson] = useState(stringifyOptionalJson(initial.cartBundlePromos));
  const [variations, setVariations] = useState<WcVariationJson[]>(() =>
    Array.isArray(initial.wcVariations) ? initial.wcVariations : [],
  );
  const [catalogSource, setCatalogSource] = useState<CatalogSource>(normalizeCatalogSource(initial.catalogSource));
  const [productStatus, setProductStatus] = useState<ProductStatus>(normalizeProductStatus(initial.productStatus));
  const [featuredOnHomepage, setFeaturedOnHomepage] = useState(Boolean(initial.featuredOnHomepage));
  const [stockQty, setStockQty] = useState(
    typeof initial.stockQuantity === "number" ? String(initial.stockQuantity) : "",
  );
  const [reservedQty, setReservedQty] = useState(
    typeof initial.reservedStock === "number" ? String(initial.reservedStock) : "0",
  );
  const [easySalesId, setEasySalesId] = useState(
    typeof initial.easySalesProductId === "number" ? String(initial.easySalesProductId) : "",
  );
  const [inStockManual, setInStockManual] = useState(initial.inStock !== false);
  const [sku, setSku] = useState(initial.wcSku ?? "");
  const specRows = useMemo(() => parseSpecRows(loc.specsText ?? ""), [loc.specsText]);
  const [socialImage, setSocialImage] = useState(initial.socialImage ?? "");
  const [noindex, setNoindex] = useState(Boolean(initial.noindex));

  const parsedStockQty = stockQty.trim() === "" ? null : Number(stockQty);
  const parsedReservedQty = reservedQty.trim() === "" ? 0 : Number(reservedQty);
  const parsedEasySalesId = easySalesId.trim() === "" ? null : Number(easySalesId);
  const hasStockNumber = parsedStockQty != null && Number.isFinite(parsedStockQty);
  const stockAvailable = hasStockNumber
    ? Math.max(
        0,
        Math.floor(
          parsedStockQty! - (Number.isFinite(parsedReservedQty) ? Math.max(0, parsedReservedQty) : 0),
        ),
      )
    : null;

  const image = images[0] ?? "";
  const fieldClass = "admin-field";

  const payload = useMemo((): TrendyolJsonProduct | null => {
    try {
      const pc = roundMoney(Number(priceCurrent));
      const pd = roundMoney(Number(priceDiscounted));
      const po = roundMoney(Number(priceOld));
      if (!Number.isFinite(pc) || !Number.isFinite(pd) || !Number.isFinite(po)) {
        return null;
      }
      let landingPromo: TrendyolJsonProduct["landingPromo"];
      try {
        landingPromo = parseOptionalJson(landingJson);
      } catch {
        return null;
      }
      let cartBundlePromos: TrendyolJsonProduct["cartBundlePromos"];
      try {
        cartBundlePromos = parseOptionalJson(bundleJson);
      } catch {
        return null;
      }
      const socialProof = socialProofText.trim() ? socialProofText.trim() : [];
      const translations = compactTranslations();
      const nlCopy = translations[defaultLocale] ?? translations[DEFAULT_LOCALE] ?? {};
      const nlName = (nlCopy.name ?? name).trim();
      const next: TrendyolJsonProduct = {
        ...initial,
        id,
        name: nlName,
        slug: (nlCopy.slug ?? "").trim() || slugifyProductTitle(nlName) || `product-${id}`,
        brand: brand.trim() || undefined,
        brandId: brandId > 0 ? brandId : undefined,
        category: category.trim() || undefined,
        url:
          url.trim() ||
          `https://www.bergasports.com/product/${slugifyProductTitle(name.trim()) || `product-${id}`}`,
        image: image.trim(),
        images: images.length ? images : [image.trim()].filter(Boolean),
        currency: currency.trim() || "EUR",
        priceCurrent: pc,
        priceCurrentText: pc.toFixed(2),
        priceDiscounted: pd,
        priceDiscountedText: pd.toFixed(2).replace(".", ","),
        priceOld: po,
        discount: { discountName: discountName.trim() },
        freeCargo,
        sameDayShipping,
        hasFastDeliveryTag,
        hasFlashSaleTag,
        socialProof,
        catalogSource,
        productStatus,
        featuredOnHomepage: productStatus === "concept" ? false : featuredOnHomepage,
        stockSyncedAt: initial.stockSyncedAt,
        easySalesSku: initial.easySalesSku,
      };
      if (parsedStockQty != null && Number.isFinite(parsedStockQty)) {
        next.stockQuantity = Math.max(0, Math.floor(parsedStockQty));
        next.reservedStock =
          Number.isFinite(parsedReservedQty) && parsedReservedQty > 0
            ? Math.max(0, Math.floor(parsedReservedQty))
            : 0;
      } else {
        delete next.stockQuantity;
        delete next.reservedStock;
      }
      if (parsedEasySalesId != null && Number.isFinite(parsedEasySalesId) && parsedEasySalesId > 0) {
        next.easySalesProductId = Math.floor(parsedEasySalesId);
      } else {
        delete next.easySalesProductId;
      }
      next.inStock =
        typeof next.stockQuantity === "number"
          ? (productAvailableStock(next) ?? 0) > 0
          : inStockManual;

      if (landingPromo !== undefined) {
        next.landingPromo = landingPromo;
      } else {
        delete next.landingPromo;
      }
      if (cartBundlePromos !== undefined) {
        next.cartBundlePromos = cartBundlePromos;
      } else {
        delete next.cartBundlePromos;
      }
      const cleanedVariations = variations
        .map((row) => {
          const parts = splitVariantLabel(row.label);
          const label = joinVariantLabel(parts.maat, parts.kleur) || row.label.trim() || `Variatie #${row.id}`;
          const price = roundMoney(Number(row.price));
          const regular = roundMoney(Number(row.regularPrice));
          if (!Number.isFinite(price)) return null;
          const nextRow: WcVariationJson = {
            id: row.id,
            label,
            price,
            regularPrice: Number.isFinite(regular) ? regular : price,
            onSale: Boolean(row.onSale && (Number.isFinite(regular) ? regular : price) > price),
            url: row.url ?? "",
          };
          if (row.sku?.trim()) nextRow.sku = row.sku.trim();
          if (row.image?.trim()) nextRow.image = row.image.trim();
          return nextRow;
        })
        .filter((row): row is WcVariationJson => row != null);
      if (cleanedVariations.length) {
        next.wcVariations = cleanedVariations;
      } else {
        delete next.wcVariations;
      }

      const shortTrim = (nlCopy.shortDescriptionHtml ?? "").trim();
      if (shortTrim) {
        next.wcShortDescriptionHtml = shortTrim;
      } else {
        delete next.wcShortDescriptionHtml;
      }
      const descTrim = (nlCopy.descriptionHtml ?? "").trim();
      if (descTrim) {
        next.wcDescriptionHtml = descTrim;
      } else {
        delete next.wcDescriptionHtml;
      }
      const skuTrim = sku.trim();
      if (skuTrim) next.wcSku = skuTrim;
      else delete next.wcSku;
      const specsTrim = (nlCopy.specsText ?? "").trim();
      if (specsTrim) next.specsText = specsTrim;
      else delete next.specsText;
      if (brandId > 0) next.brandId = brandId;
      else delete next.brandId;
      if (brand.trim()) next.brand = brand.trim();
      else delete next.brand;
      const seoTitleTrim = (nlCopy.seoTitle ?? "").trim();
      if (seoTitleTrim) next.seoTitle = seoTitleTrim;
      else delete next.seoTitle;
      const seoDescTrim = (nlCopy.seoDescription ?? "").trim();
      if (seoDescTrim) next.seoDescription = seoDescTrim;
      else delete next.seoDescription;
      const ogTitleTrim = (nlCopy.ogTitle ?? "").trim();
      if (ogTitleTrim) next.ogTitle = ogTitleTrim;
      else delete next.ogTitle;
      const ogDescTrim = (nlCopy.ogDescription ?? "").trim();
      if (ogDescTrim) next.ogDescription = ogDescTrim;
      else delete next.ogDescription;
      const socialTrim = socialImage.trim();
      if (socialTrim) next.socialImage = socialTrim;
      else delete next.socialImage;
      const altTrim = (nlCopy.imageAlt ?? "").trim();
      if (altTrim) next.imageAlt = altTrim;
      else delete next.imageAlt;
      next.noindex = noindex;
      next.translations = translations;

      return next;
    } catch {
      return null;
    }
  }, [
    initial,
    id,
    name,
    brand,
    brandId,
    category,
    url,
    image,
    images,
    currency,
    priceCurrent,
    priceDiscounted,
    priceOld,
    discountName,
    freeCargo,
    sameDayShipping,
    hasFastDeliveryTag,
    hasFlashSaleTag,
    productStatus,
    featuredOnHomepage,
    parsedStockQty,
    parsedReservedQty,
    parsedEasySalesId,
    inStockManual,
    socialProofText,
    landingJson,
    bundleJson,
    variations,
    catalogSource,
    sku,
    socialImage,
    noindex,
    compactTranslations,
    defaultLocale,
  ]);

  useEffect(() => {
    if (!saveOk) {
      return;
    }
    const t = window.setTimeout(() => setSaveOk(false), 3500);
    return () => window.clearTimeout(t);
  }, [saveOk]);

  async function save() {
    setError("");
    const body = payload;
    if (!body) {
      setError("Controleer prijzen en JSON onder Technisch.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Opslaan mislukt");
        setSaving(false);
        return;
      }
      setSaveOk(true);
      router.refresh();
    } catch {
      setError("Geen verbinding");
    }
    setSaving(false);
  }

  async function remove() {
    if (!window.confirm(`Product ${id} verwijderen? Dit kun je niet ongedaan maken.`)) {
      return;
    }
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verwijderen mislukt");
        setDeleting(false);
        return;
      }
      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Geen verbinding");
    }
    setDeleting(false);
  }

  const titlePreview = decodeImportedProductTitle(name.trim() || "—");
  const imagePreviewOk = isPreviewableImageUrl(image.trim());
  const extraImages = images.slice(1).filter((u) => isPreviewableImageUrl(u));

  async function normalizeMainImage() {
    if (!imagePreviewOk || normalizingImage) return;
    setNormalizingImage(true);
    setNormalizeMsg("");
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${id}/normalize-image`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply: true }),
      });
      const data = (await res.json()) as {
        error?: string;
        warning?: string;
        imageUrl?: string;
        rule?: { label?: string };
        applied?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error || "Normalisatie mislukt");
      }
      const nextUrl = data.imageUrl?.trim();
      if (nextUrl) {
        setImages((prev) => {
          const rest = prev.filter((u) => u.trim().toLowerCase() !== nextUrl.toLowerCase());
          return [nextUrl, ...rest];
        });
      }
      const ruleLabel = data.rule?.label ? ` (${data.rule.label})` : "";
      if (data.warning) {
        setNormalizeMsg(data.warning);
      } else if (data.applied) {
        setNormalizeMsg(`Foto genormaliseerd${ruleLabel}. Nieuwe hoofdfoto opgeslagen; origineel staat in de galerij.`);
      } else {
        setNormalizeMsg(`Foto genormaliseerd${ruleLabel}.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Normalisatie mislukt");
    } finally {
      setNormalizingImage(false);
    }
  }

  const categoryOptionGroups = useMemo(() => {
    const groups = new Map<string, CategoryOption[]>();
    for (const option of categoryOptions) {
      const group = option.group ?? "";
      const list = groups.get(group) ?? [];
      list.push(option);
      groups.set(group, list);
    }
    return [...groups.entries()];
  }, [categoryOptions]);

  const categorySelectValue = useMemo(() => {
    if (!category) return "";
    if (categoryOptions.some((c) => c.name === category)) return category;
    const dutch = dutchLabelFromImportedName(category);
    const mapped = categoryOptions.find((c) => c.name === dutch || c.slug === category.toLowerCase());
    return mapped?.name ?? category;
  }, [category, categoryOptions]);

  const brandSelectValue = useMemo(() => {
    if (brandId > 0 && brandOptions.some((b) => b.id === brandId)) return String(brandId);
    if (brand.trim()) {
      const matched = brandOptions.find(
        (b) => b.name.toLowerCase() === brand.trim().toLowerCase() || b.slug === brand.trim().toLowerCase(),
      );
      if (matched) return String(matched.id);
      return "legacy";
    }
    return "";
  }, [brand, brandId, brandOptions]);

  function addUploadedImage(uploadedUrl: string, alt?: string | null, asMain = false) {
    setError("");
    if (asMain && alt?.trim() && !(loc.imageAlt ?? "").trim()) {
      setLoc("imageAlt", alt.trim());
    }
    setImages((prev) => {
      const without = prev.filter((u) => u.trim().toLowerCase() !== uploadedUrl.toLowerCase());
      return asMain ? [uploadedUrl, ...without] : mergeImageUrls(without, uploadedUrl);
    });
  }

  function promoteImage(urlToPromote: string) {
    setImages((prev) => {
      const next = urlToPromote.trim();
      if (!next) return prev;
      const without = prev.filter((u) => u.trim().toLowerCase() !== next.toLowerCase());
      return [next, ...without];
    });
  }

  function removeImage(urlToRemove: string) {
    setImages((prev) => prev.filter((u) => u.trim().toLowerCase() !== urlToRemove.trim().toLowerCase()));
  }

  function handlePasteImageUrls() {
    const raw = window.prompt(
      "Plak één of meer foto-URL’s (https…). Meerdere URL’s scheiden met komma’s of nieuwe regels.",
      "",
    );
    if (raw == null || !raw.trim()) return;
    setImages((prev) => mergeImageUrls(prev, raw));
  }

  function updateSpec(key: string, patch: Partial<SpecRow>) {
    const next = specRows.map((row) => (row.key === key ? { ...row, ...patch } : row));
    setLoc("specsText", specRowsToText(next));
  }

  function addSpecRow() {
    setLoc("specsText", specRowsToText([...specRows, { key: `spec-${Date.now()}`, name: "", value: "" }]));
  }

  function updateVariation(variationId: number, patch: Partial<WcVariationJson>) {
    setVariations((prev) => prev.map((row) => (row.id === variationId ? { ...row, ...patch } : row)));
  }

  function addVariation() {
    setVariations((prev) => [
      ...prev,
      {
        id: nextVariationId(prev),
        label: "",
        price: roundMoney(Number(priceDiscounted) || Number(priceCurrent) || 0),
        regularPrice: roundMoney(Number(priceCurrent) || 0),
        onSale: false,
        url: "",
      },
    ]);
  }

  const priceLabel = (() => {
    const n = Number(priceDiscounted || priceCurrent);
    if (!Number.isFinite(n)) return "";
    try {
      return formatProductPrice(n, currency.trim() || "EUR");
    } catch {
      return `${n} ${currency}`;
    }
  })();

  function renderSaveActions() {
    return (
      <div className="admin-form-actions">
        <button type="button" onClick={() => void save()} disabled={saving} className="admin-btn-primary">
          {saving ? "Opslaan…" : "Opslaan"}
        </button>
        <button type="button" onClick={() => void remove()} disabled={deleting} className="admin-btn-danger">
          {deleting ? "…" : "Verwijderen"}
        </button>
      </div>
    );
  }

  return (
    <div className="admin-product-editor-root admin-stack">
      <Link href="/admin/products" className="admin-breadcrumb">
        ← Alle producten
      </Link>

      <header className="admin-product-editor-head">
        <div>
          <p className="admin-product-editor-kicker">Product</p>
          <h1 className="admin-h1 admin-m-0">{titlePreview}</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">ID {id}</p>
        </div>
        <div className="admin-product-editor-head-meta">{renderSaveActions()}</div>
      </header>

      <AdminLocaleTabs
        languages={languages}
        value={editLocale}
        onChange={setEditLocale}
        filledLocales={filled}
        hint="Teksten hieronder gelden voor de geselecteerde taal. Lege velden vallen in de shop terug op Nederlands."
      />

      {saveOk ? (
        <div className="admin-banner ok admin-m-0" role="status">
          Wijzigingen opgeslagen.
        </div>
      ) : null}
      {error ? <div className="admin-error-box">{error}</div> : null}

      <div className="admin-product-editor-grid">
        <div className="admin-product-editor-main">
          <Section title="Product" hint="Naam en teksten op de productpagina.">
            <label className="admin-label">
              Naam
              <input className={fieldClass} value={name} onChange={(e) => setLoc("name", e.target.value)} />
            </label>
            <div>
              <p className="admin-label">Korte omschrijving</p>
              <AdminHtmlEditor
                minHeight="compact"
                placeholder="Korte tekst bovenaan de productpagina…"
                value={loc.shortDescriptionHtml ?? ""}
                onChange={(html) => setLoc("shortDescriptionHtml", html)}
                imageFolder="products"
                onImageError={setError}
              />
            </div>
            <div>
              <p className="admin-label">Omschrijving</p>
              <AdminHtmlEditor
                minHeight="tall"
                placeholder="Uitgebreide producttekst…"
                value={loc.descriptionHtml ?? ""}
                onChange={(html) => setLoc("descriptionHtml", html)}
                imageFolder="products"
                onImageError={setError}
              />
            </div>
          </Section>

          <Section title="Media">
            <div className="admin-product-media">
              {imagePreviewOk ? (
                <div className="admin-product-hero">
                  <img src={image.trim()} alt="" />
                  <span className="admin-product-hero-badge">Hoofdfoto</span>
                </div>
              ) : (
                <div className="admin-product-hero admin-product-hero--empty">Geen hoofdfoto</div>
              )}
              <div className="admin-product-media-tools">
                {extraImages.length > 0 ? (
                  <div className="admin-product-gallery" role="list">
                    {extraImages.map((src) => (
                      <div key={src} className="admin-product-gallery-item" role="listitem">
                        <button
                          type="button"
                          className="admin-product-gallery-thumb"
                          title="Als hoofdfoto instellen"
                          onClick={() => promoteImage(src)}
                        >
                          <img src={src} alt="" loading="lazy" decoding="async" />
                        </button>
                        <button
                          type="button"
                          className="admin-product-gallery-remove"
                          title="Foto verwijderen"
                          onClick={() => removeImage(src)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="admin-media-actions">
                  <AdminImageUploadButton
                    label="Upload hoofdfoto"
                    folder="products"
                    onUploaded={(uploadedUrl, alt) => addUploadedImage(uploadedUrl, alt, true)}
                    onError={(message) => setError(message)}
                  />
                  <AdminImageUploadButton
                    label="Sleep extra foto’s hierheen"
                    folder="products"
                    multiple
                    variant="dropzone"
                    className="admin-dropzone--compact"
                    onUploaded={(uploadedUrl) => addUploadedImage(uploadedUrl)}
                    onError={(message) => setError(message)}
                  />
                </div>
                {imagePreviewOk ? (
                  <div className="admin-stack-tight">
                    <button
                      type="button"
                      className="admin-btn-secondary admin-w-fit"
                      disabled={normalizingImage}
                      onClick={() => void normalizeMainImage()}
                    >
                      {normalizingImage ? "Bezig met eendracht…" : "Foto eendracht / normaliseren"}
                    </button>
                    <p className="admin-muted admin-m-0" style={{ fontSize: "0.8rem" }}>
                      Zelfde hoek/achtergrond per categorie via OpenAI Images. Duurt ~30–90 sec.
                      Vereist een opgeslagen API-key onder Instellingen → OpenAI (sk-… + Opslaan).
                      Foutmeldingen (geen key, billing, model) verschijnen hieronder.
                    </p>
                    {normalizeMsg ? (
                      <div className="admin-banner ok admin-m-0" role="status">
                        {normalizeMsg}
                      </div>
                    ) : null}
                    <button type="button" className="admin-link-action admin-w-fit" onClick={() => removeImage(image)}>
                      Hoofdfoto verwijderen
                    </button>
                  </div>
                ) : null}
                <label className="admin-label">
                  Alt-tekst hoofdfoto
                  <input
                    className={fieldClass}
                    value={loc.imageAlt ?? ""}
                    onChange={(e) => setLoc("imageAlt", e.target.value)}
                  />
                </label>
                <details>
                  <summary className="admin-muted" style={{ cursor: "pointer", fontSize: "0.8rem" }}>
                    URL’s plakken
                  </summary>
                  <div className="admin-stack-tight admin-mt-1">
                    <label className="admin-label">
                      Hoofdfoto (URL)
                      <input
                        className={fieldClass}
                        value={image}
                        onChange={(e) => {
                          const next = e.target.value;
                          setImages((prev) => {
                            const rest = prev.slice(1);
                            return next.trim() ? [next, ...rest] : rest;
                          });
                        }}
                      />
                    </label>
                    <button type="button" className="admin-btn-secondary admin-w-fit" onClick={handlePasteImageUrls}>
                      Extra URL’s plakken
                    </button>
                  </div>
                </details>
              </div>
            </div>
          </Section>

          <Section title="Prijs">
            <div className="admin-form-grid">
              <label className="admin-label">
                Prijs
                <AdminMoneyInput className={fieldClass} value={priceDiscounted} onChange={setPriceDiscounted} />
              </label>
              <label className="admin-label">
                Van-prijs (0 = geen)
                <AdminMoneyInput className={fieldClass} value={priceOld} onChange={setPriceOld} />
              </label>
              <label className="admin-label">
                Adviesprijs
                <AdminMoneyInput className={fieldClass} value={priceCurrent} onChange={setPriceCurrent} />
              </label>
              <label className="admin-label">
                Kortingslabel
                <input className={fieldClass} value={discountName} onChange={(e) => setDiscountName(e.target.value)} />
              </label>
            </div>
          </Section>

          <Section title="Voorraad & SKU">
            <div className="admin-form-grid">
              <label className="admin-label">
                SKU
                <input className={fieldClass} value={sku} onChange={(e) => setSku(e.target.value)} />
              </label>
              <label className="admin-label">
                Aantal
                <input
                  className={fieldClass}
                  type="number"
                  min={0}
                  step={1}
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  placeholder="bijv. 12"
                />
              </label>
              <label className="admin-label">
                Gereserveerd
                <input
                  className={fieldClass}
                  type="number"
                  min={0}
                  step={1}
                  value={reservedQty}
                  onChange={(e) => setReservedQty(e.target.value)}
                />
              </label>
              <div>
                <p className="admin-label admin-m-0">Beschikbaar</p>
                <p className="admin-product-stock-available">
                  {stockAvailable != null ? stockAvailable : <span className="admin-muted">—</span>}
                </p>
              </div>
              <label className="admin-label">
                Voorraadstatus
                <select
                  className={fieldClass}
                  value={hasStockNumber ? (stockAvailable! > 0 ? "in" : "out") : inStockManual ? "in" : "out"}
                  disabled={hasStockNumber}
                  onChange={(e) => setInStockManual(e.target.value === "in")}
                >
                  <option value="in">Op voorraad</option>
                  <option value="out">Uitverkocht</option>
                </select>
              </label>
            </div>
            <p className="admin-muted admin-m-0">
              {hasStockNumber
                ? "Status volgt automatisch het aantal hierboven."
                : "Zonder aantal geldt de handmatige voorraadstatus."}
            </p>
          </Section>

          <Section title="Specificaties">
            {specRows.length === 0 ? (
              <p className="admin-muted admin-m-0">Nog geen specificaties.</p>
            ) : (
              <div className="admin-product-kv-list">
                <div className="admin-product-kv admin-product-kv--head">
                  <span>Naam</span>
                  <span>Waarde</span>
                  <span />
                </div>
                {specRows.map((row) => (
                  <div key={row.key} className="admin-product-kv">
                    <input
                      className={`${fieldClass} admin-field--flush`}
                      value={row.name}
                      onChange={(e) => updateSpec(row.key, { name: e.target.value })}
                      placeholder="bijv. Frame"
                    />
                    <input
                      className={`${fieldClass} admin-field--flush`}
                      value={row.value}
                      onChange={(e) => updateSpec(row.key, { value: e.target.value })}
                      placeholder="bijv. Carbon"
                    />
                    <button
                      type="button"
                      className="admin-btn-danger admin-btn-danger--sm"
                      onClick={() =>
                        setLoc(
                          "specsText",
                          specRowsToText(specRows.filter((item) => item.key !== row.key)),
                        )
                      }
                    >
                      Weg
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="admin-btn-secondary admin-w-fit" onClick={addSpecRow}>
              Specificatie toevoegen
            </button>
          </Section>

          <Section
            title="Varianten"
            hint="Maat en kleur uit het bestaande label. Voorraad is per product, niet per variant."
          >
            {variations.length === 0 ? (
              <p className="admin-muted admin-m-0">Nog geen varianten.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table admin-product-variant-table">
                  <thead>
                    <tr>
                      <th>Maat</th>
                      <th>Kleur</th>
                      <th>Prijs</th>
                      <th>SKU</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {variations.map((row) => {
                      const parts = splitVariantLabel(row.label);
                      return (
                        <tr key={row.id}>
                          <td>
                            <input
                              className={`${fieldClass} admin-field--flush`}
                              value={parts.maat}
                              onChange={(e) =>
                                updateVariation(row.id, { label: joinVariantLabel(e.target.value, parts.kleur) })
                              }
                              placeholder="M"
                            />
                          </td>
                          <td>
                            <input
                              className={`${fieldClass} admin-field--flush`}
                              value={parts.kleur}
                              onChange={(e) =>
                                updateVariation(row.id, { label: joinVariantLabel(parts.maat, e.target.value) })
                              }
                              placeholder="Zwart"
                            />
                          </td>
                          <td>
                            <AdminMoneyInput
                              className={`${fieldClass} admin-field--flush`}
                              value={formatMoneyInput(row.price)}
                              onChange={(next) => {
                                const price = Number(next);
                                const n = Number.isFinite(price) ? price : 0;
                                updateVariation(row.id, {
                                  price: n,
                                  regularPrice: row.onSale ? row.regularPrice : n,
                                });
                              }}
                            />
                          </td>
                          <td>
                            <input
                              className={`${fieldClass} admin-field--flush`}
                              value={row.sku ?? ""}
                              onChange={(e) => updateVariation(row.id, { sku: e.target.value })}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="admin-btn-danger admin-btn-danger--sm"
                              onClick={() => setVariations((prev) => prev.filter((item) => item.id !== row.id))}
                            >
                              Weg
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <button type="button" className="admin-btn-secondary admin-w-fit" onClick={addVariation}>
              Variant toevoegen
            </button>
          </Section>

          <Fold title="SEO" hint="Zoektitel, slug en hoe dit product in Google en socials verschijnt.">
            <div className="admin-form-grid">
              <label className="admin-label admin-span-2">
                URL-slug
                <input
                  className={fieldClass}
                  value={loc.slug ?? ""}
                  onChange={(e) => setLoc("slug", slugifyProductTitle(e.target.value) || e.target.value)}
                  placeholder={slugifyProductTitle(name) || "product-url"}
                />
              </label>
              <label className="admin-label admin-span-2">
                SEO-titel
                <input className={fieldClass} value={loc.seoTitle ?? ""} onChange={(e) => setLoc("seoTitle", e.target.value)} />
              </label>
              <label className="admin-label admin-span-2">
                Meta description
                <textarea className={fieldClass} value={loc.seoDescription ?? ""} onChange={(e) => setLoc("seoDescription", e.target.value)} />
              </label>
              <label className="admin-label admin-span-2">
                Open Graph titel
                <input className={fieldClass} value={loc.ogTitle ?? ""} onChange={(e) => setLoc("ogTitle", e.target.value)} />
              </label>
              <label className="admin-label admin-span-2">
                Open Graph tekst
                <textarea className={fieldClass} value={loc.ogDescription ?? ""} onChange={(e) => setLoc("ogDescription", e.target.value)} />
              </label>
              <label className="admin-label admin-span-2">
                Social image URL
                <input className={fieldClass} value={socialImage} onChange={(e) => setSocialImage(e.target.value)} />
              </label>
              <div className="admin-span-2 admin-form-actions">
                <AdminImageUploadButton
                  label="Social image uploaden"
                  folder="products"
                  onUploaded={(uploadedUrl) => {
                    setError("");
                    setSocialImage(uploadedUrl);
                  }}
                  onError={(message) => setError(message)}
                />
              </div>
              <label className="admin-check-highlight admin-span-2" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={noindex} onChange={(e) => setNoindex(e.target.checked)} />
                Niet indexeren (noindex)
              </label>
            </div>
          </Fold>
        </div>

        <aside className="admin-product-editor-side" aria-label="Publicatie en indeling">
          <Section title="Status">
            <select
              className={fieldClass}
              aria-label="Status"
              value={productStatus}
              onChange={(e) => {
                const next = normalizeProductStatus(e.target.value);
                setProductStatus(next);
                if (next === "concept") setFeaturedOnHomepage(false);
              }}
            >
              {PRODUCT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PRODUCT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <label className="admin-check-highlight" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={featuredOnHomepage}
                disabled={productStatus === "concept"}
                onChange={(e) => setFeaturedOnHomepage(e.target.checked)}
              />
              Uitgelicht op de homepage
            </label>
            <p className="admin-muted admin-m-0">
              Concept blijft verborgen in de shop, zoekresultaten en sitemap.
            </p>
          </Section>

          <Section title="Categorie">
            {categoryOptions.length > 0 ? (
              <select
                className={fieldClass}
                value={categorySelectValue}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">— Kies —</option>
                {category && !categoryOptions.some((c) => c.name === categorySelectValue) ? (
                  <option value={category}>{dutchLabelFromImportedName(category)}</option>
                ) : null}
                {categoryOptionGroups.map(([group, items]) =>
                  group ? (
                    <optgroup key={group} label={group}>
                      {items.map((c) => (
                        <option key={c.slug} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    items.map((c) => (
                      <option key={c.slug} value={c.name}>
                        {c.name}
                      </option>
                    ))
                  ),
                )}
              </select>
            ) : (
              <input className={fieldClass} value={category} onChange={(e) => setCategory(e.target.value)} />
            )}
          </Section>

          <Section title="Merk">
            <select
              className={fieldClass}
              value={brandSelectValue}
              aria-label="Merk"
              onChange={(e) => {
                const raw = e.target.value;
                if (!raw || raw === "legacy") {
                  if (raw !== "legacy") {
                    setBrandId(0);
                    setBrand("");
                  }
                  return;
                }
                const nextId = Number(raw);
                const row = brandOptions.find((b) => b.id === nextId);
                setBrandId(nextId);
                setBrand(row?.name ?? brand);
              }}
            >
              <option value="">— Geen merk —</option>
              {brandSelectValue === "legacy" ? <option value="legacy">{brand}</option> : null}
              {brandOptions.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                  {b.visible ? "" : " (verborgen)"}
                </option>
              ))}
            </select>
            <p className="admin-muted admin-m-0">
              Beheer de lijst onder{" "}
              <Link href="/admin/brands" className="admin-link-action">
                Merken
              </Link>
              .
            </p>
          </Section>

          <Section title="Shop">
            <Link
              href={productPath(shopSlugPreview)}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-link-action"
            >
              Bekijk in de shop
            </Link>
            <p className="admin-muted admin-m-0">/{shopSlugPreview}</p>
          </Section>
        </aside>
      </div>

      <Fold title="Technisch" hint="Importbron, Easy Sales, tags en ruwe JSON. Alleen nodig bij koppelingen of troubleshooting.">
        <div className="admin-form-grid">
          <label className="admin-label">
            Bron
            <select
              className={fieldClass}
              value={catalogSource}
              onChange={(e) => setCatalogSource(e.target.value as CatalogSource)}
            >
              {CATALOG_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s === "trendyol" ? "Trendyol (import)" : s === "ralex" ? "Ralex" : "Handmatig / admin"}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-label">
            Easy Sales product-ID
            <input
              className={fieldClass}
              type="number"
              min={1}
              step={1}
              value={easySalesId}
              onChange={(e) => setEasySalesId(e.target.value)}
              placeholder="uit Easy Sales"
            />
          </label>
          <label className="admin-label">
            Valuta
            <input className={fieldClass} value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </label>
          <label className="admin-label admin-span-2">
            Product-URL
            <input className={fieldClass} value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label className="admin-label admin-span-2">
            Social proof
            <input className={fieldClass} value={socialProofText} onChange={(e) => setSocialProofText(e.target.value)} />
          </label>
        </div>
        {initial.stockSyncedAt ? (
          <p className="admin-muted admin-m-0">
            Laatste Easy Sales-sync: {new Date(initial.stockSyncedAt).toLocaleString("nl-NL")}
            {initial.easySalesSku ? ` · ES SKU ${initial.easySalesSku}` : ""}
          </p>
        ) : (
          <p className="admin-muted admin-m-0">
            Niet gekoppeld aan Easy Sales. Voorraad beheer je hierboven of via{" "}
            <Link href="/admin/inventory" className="admin-link-action">
              Voorraad
            </Link>
            .
          </p>
        )}
        <div className="admin-inline-checks">
          <label>
            <input type="checkbox" checked={freeCargo} onChange={(e) => setFreeCargo(e.target.checked)} />
            Gratis verzending (weergave)
          </label>
          <label>
            <input type="checkbox" checked={sameDayShipping} onChange={(e) => setSameDayShipping(e.target.checked)} />
            Same-day verzending
          </label>
          <label>
            <input
              type="checkbox"
              checked={hasFastDeliveryTag}
              onChange={(e) => setHasFastDeliveryTag(e.target.checked)}
            />
            Tag: snelle levering
          </label>
          <label>
            <input type="checkbox" checked={hasFlashSaleTag} onChange={(e) => setHasFlashSaleTag(e.target.checked)} />
            Tag: flash sale
          </label>
        </div>
        <label className="admin-label">
          Landingpromo (JSON)
          <textarea
            className={`${fieldClass} admin-field--mono admin-field--tall-lg`}
            value={landingJson}
            onChange={(e) => setLandingJson(e.target.value)}
            spellCheck={false}
          />
        </label>
        <label className="admin-label">
          Winkelwagenbundels (JSON)
          <textarea
            className={`${fieldClass} admin-field--mono admin-field--tall-xl`}
            value={bundleJson}
            onChange={(e) => setBundleJson(e.target.value)}
            spellCheck={false}
          />
        </label>
      </Fold>

      <div className="admin-editor-sticky">
        <div className="admin-editor-sticky-inner">
          <span className="admin-muted">
            {titlePreview}
            {priceLabel ? ` · ${priceLabel}` : ""}
            {stockAvailable != null ? ` · ${stockAvailable} op voorraad` : ""}
            {payload ? "" : " · controleer invoer"}
          </span>
          {renderSaveActions()}
        </div>
      </div>
    </div>
  );
}
