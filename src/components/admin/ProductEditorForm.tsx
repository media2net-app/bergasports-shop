"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import AdminHtmlEditor from "@/components/admin/AdminHtmlEditor";
import AdminImageUploadButton from "@/components/admin/AdminImageUploadButton";
import { productPath, slugifyProductTitle } from "@/lib/product-slug";
import {
  CATALOG_SOURCES,
  decodeImportedProductTitle,
  normalizeCatalogSource,
  type CatalogSource,
  type TrendyolJsonProduct,
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

function imagesToText(images: string[] | undefined): string {
  return (images ?? []).join("\n");
}

function textToImages(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function appendImageUrls(existingText: string, rawPaste: string): string {
  const current = textToImages(existingText);
  const set = new Set(current.map((x) => x.trim().toLowerCase()));
  const merged = [...current];
  const parts = rawPaste
    .split(/[\n\r,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const p of parts) {
    if (!isPreviewableImageUrl(p)) {
      continue;
    }
    const k = p.toLowerCase();
    if (set.has(k)) {
      continue;
    }
    set.add(k);
    merged.push(p);
  }
  return merged.join("\n");
}

type CategoryOption = { slug: string; name: string; group?: string };

type ProductEditorFormProps = {
  initial: TrendyolJsonProduct;
  categoryOptions?: CategoryOption[];
};

export default function ProductEditorForm({ initial, categoryOptions = [] }: ProductEditorFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [id] = useState(initial.id);
  const [name, setName] = useState(initial.name);
  const shopSlugPreview = slugifyProductTitle(name) || initial.slug || `product-${id}`;
  const [brand, setBrand] = useState(initial.brand ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [url, setUrl] = useState(initial.url);
  const [image, setImage] = useState(initial.image);
  const [imagesText, setImagesText] = useState(imagesToText(initial.images));
  const [currency, setCurrency] = useState(initial.currency ?? "EUR");
  const [priceCurrent, setPriceCurrent] = useState(String(initial.priceCurrent ?? 0));
  const [priceDiscounted, setPriceDiscounted] = useState(String(initial.priceDiscounted ?? 0));
  const [priceOld, setPriceOld] = useState(String(initial.priceOld ?? 0));
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
  const [variationsJson, setVariationsJson] = useState(stringifyOptionalJson(initial.wcVariations));
  const [wcShortHtml, setWcShortHtml] = useState(initial.wcShortDescriptionHtml ?? "");
  const [wcDescHtml, setWcDescHtml] = useState(initial.wcDescriptionHtml ?? "");
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
  const [specsText, setSpecsText] = useState(initial.specsText ?? "");
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription ?? "");
  const [ogTitle, setOgTitle] = useState(initial.ogTitle ?? "");
  const [ogDescription, setOgDescription] = useState(initial.ogDescription ?? "");
  const [socialImage, setSocialImage] = useState(initial.socialImage ?? "");
  const [imageAlt, setImageAlt] = useState(initial.imageAlt ?? "");
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

  const mainImageInputRef = useRef<HTMLInputElement>(null);

  const labelClass = "admin-label";
  const fieldClass = "admin-field";

  const payload = useMemo((): TrendyolJsonProduct | null => {
    try {
      const pc = Number(priceCurrent);
      const pd = Number(priceDiscounted);
      const po = Number(priceOld);
      if (Number.isNaN(pc) || Number.isNaN(pd) || Number.isNaN(po)) {
        return null;
      }
      const images = textToImages(imagesText);
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
      let wcVariations: TrendyolJsonProduct["wcVariations"];
      try {
        wcVariations = parseOptionalJson(variationsJson);
      } catch {
        return null;
      }
      const socialProof = socialProofText.trim() ? socialProofText.trim() : [];
      const next: TrendyolJsonProduct = {
        ...initial,
        id,
        name: name.trim(),
        brand: brand.trim() || undefined,
        category: category.trim() || undefined,
        url:
          url.trim() ||
          `https://www.bergasports.com/product/${slugifyProductTitle(name.trim()) || `product-${id}`}`,
        image: image.trim(),
        images: images.length ? images : [image.trim()].filter(Boolean),
        currency: currency.trim() || "EUR",
        priceCurrent: pc,
        priceCurrentText: String(pc),
        priceDiscounted: pd,
        priceDiscountedText: String(pd).replace(".", ","),
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
      if (wcVariations !== undefined) {
        next.wcVariations = wcVariations;
      } else {
        delete next.wcVariations;
      }

      const shortTrim = wcShortHtml.trim();
      if (shortTrim) {
        next.wcShortDescriptionHtml = shortTrim;
      } else {
        delete next.wcShortDescriptionHtml;
      }
      const descTrim = wcDescHtml.trim();
      if (descTrim) {
        next.wcDescriptionHtml = descTrim;
      } else {
        delete next.wcDescriptionHtml;
      }
      const skuTrim = sku.trim();
      if (skuTrim) next.wcSku = skuTrim;
      else delete next.wcSku;
      const specsTrim = specsText.trim();
      if (specsTrim) next.specsText = specsTrim;
      else delete next.specsText;
      const seoTitleTrim = seoTitle.trim();
      if (seoTitleTrim) next.seoTitle = seoTitleTrim;
      else delete next.seoTitle;
      const seoDescTrim = seoDescription.trim();
      if (seoDescTrim) next.seoDescription = seoDescTrim;
      else delete next.seoDescription;
      const ogTitleTrim = ogTitle.trim();
      if (ogTitleTrim) next.ogTitle = ogTitleTrim;
      else delete next.ogTitle;
      const ogDescTrim = ogDescription.trim();
      if (ogDescTrim) next.ogDescription = ogDescTrim;
      else delete next.ogDescription;
      const socialTrim = socialImage.trim();
      if (socialTrim) next.socialImage = socialTrim;
      else delete next.socialImage;
      const altTrim = imageAlt.trim();
      if (altTrim) next.imageAlt = altTrim;
      else delete next.imageAlt;
      next.noindex = noindex;

      return next;
    } catch {
      return null;
    }
  }, [
    initial,
    id,
    name,
    brand,
    category,
    url,
    image,
    imagesText,
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
    stockQty,
    reservedQty,
    easySalesId,
    inStockManual,
    socialProofText,
    landingJson,
    bundleJson,
    variationsJson,
    wcShortHtml,
    wcDescHtml,
    catalogSource,
    sku,
    specsText,
    seoTitle,
    seoDescription,
    ogTitle,
    ogDescription,
    socialImage,
    imageAlt,
    noindex,
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
      setError("Controleer prijzen en JSON (variaties / landing / bundles).");
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
  const imageTrim = image.trim();
  const imagePreviewOk = isPreviewableImageUrl(imageTrim);

  const extraImageUrls = useMemo(() => {
    const mainKey = image.trim().toLowerCase();
    const seen = new Set<string>();
    return textToImages(imagesText).filter((u) => {
      const t = u.trim();
      if (!t || !isPreviewableImageUrl(t)) {
        return false;
      }
      const k = t.toLowerCase();
      if (k === mainKey) {
        return false;
      }
      if (seen.has(k)) {
        return false;
      }
      seen.add(k);
      return true;
    });
  }, [imagesText, image]);

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

  function handleAddImages() {
    const raw = window.prompt(
      "Plak één of meer foto-URL’s (https…). Meerdere URL’s scheiden met komma’s of nieuwe regels.",
      "",
    );
    if (raw == null || !raw.trim()) {
      return;
    }
    setImagesText((prev) => appendImageUrls(prev, raw));
  }

  function handleChangeMainPhoto() {
    const el = mainImageInputRef.current;
    if (!el) {
      return;
    }
    el.focus();
    el.select();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handlePromoteExtraToMain(url: string) {
    const nextMain = url.trim();
    if (!nextMain) {
      return;
    }
    const prevMain = image.trim();
    setImage(nextMain);
    setImagesText((prev) => {
      let lines = textToImages(prev).filter((l) => l.trim().toLowerCase() !== nextMain.toLowerCase());
      if (
        prevMain &&
        /^https?:\/\//i.test(prevMain) &&
        prevMain.toLowerCase() !== nextMain.toLowerCase()
      ) {
        const hasOld = lines.some((l) => l.trim().toLowerCase() === prevMain.toLowerCase());
        if (!hasOld) {
          lines = [prevMain, ...lines];
        }
      }
      return lines.join("\n");
    });
  }

  return (
    <div className="admin-product-editor-root admin-stack">
      <div className="admin-page-head">
        <div>
          <Link href="/admin/products" className="admin-breadcrumb">
            ← Alle producten
          </Link>
          <h1 className="admin-h1">{titlePreview}</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">Product bewerken · ID {id}</p>
          <p className="admin-muted admin-m-0 admin-mt-05">
            <Link
              href={productPath(shopSlugPreview)}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-link-action"
            >
              Bekijk in de shop
            </Link>
            <span> · {productPath(shopSlugPreview)}</span>
          </p>
        </div>
        <div className="admin-form-actions">
          <button type="button" onClick={save} disabled={saving} className="admin-btn-primary">
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
          <button type="button" onClick={remove} disabled={deleting} className="admin-btn-danger">
            {deleting ? "…" : "Verwijderen"}
          </button>
        </div>
      </div>

      {saveOk ? (
        <div className="admin-banner ok admin-m-0" role="status">
          Wijzigingen opgeslagen.
        </div>
      ) : null}
      {error ? <div className="admin-error-box">{error}</div> : null}

      <div className="admin-product-editor-grid">
        <div className="admin-product-editor-main">
          <div className="admin-panel-surface">
            <h2 className="admin-section-title">Catalogus</h2>
            <label className={labelClass}>Bron</label>
            <select
              className={`${fieldClass} admin-max-w-md`}
              value={catalogSource}
              onChange={(e) => setCatalogSource(e.target.value as CatalogSource)}
            >
              {CATALOG_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s === "trendyol" ? "Trendyol (import)" : s === "ralex" ? "Ralex" : "Handmatig / admin"}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">Basisgegevens</h2>
            <div className="admin-form-grid">
              <div className="admin-span-2">
                <label className={labelClass}>Naam</label>
                <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Merk</label>
                <input className={fieldClass} value={brand} onChange={(e) => setBrand(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Categorie / subcategorie</label>
                {categoryOptions.length > 0 ? (
                  <select
                    className={fieldClass}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">— Kies —</option>
                    {category && !categoryOptions.some((c) => c.name === category) ? (
                      <option value={category}>{category}</option>
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
              </div>
              <div>
                <label className={labelClass}>SKU</label>
                <input className={fieldClass} value={sku} onChange={(e) => setSku(e.target.value)} />
              </div>
              <div className="admin-span-2">
                <label className={labelClass}>Specificaties (één per regel, bijv. Frame: Carbon)</label>
                <textarea
                  className={`${fieldClass} admin-field--tall`}
                  value={specsText}
                  onChange={(e) => setSpecsText(e.target.value)}
                />
              </div>
              <div className="admin-span-2">
                <label className={labelClass}>Product URL</label>
                <input className={fieldClass} value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
              <div className="admin-span-2">
                <label className={labelClass}>Social proof (tekst; leeg = geen)</label>
                <input
                  className={fieldClass}
                  value={socialProofText}
                  onChange={(e) => setSocialProofText(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">Beschrijving</h2>
            <p className="admin-muted admin-m-0 admin-text-sm">
              Tekst op de productpagina. Koppen, vet, lijsten, links en foto’s — geen ruwe HTML.
            </p>
            <div>
              <label className={labelClass}>Korte omschrijving</label>
              <AdminHtmlEditor
                minHeight="compact"
                placeholder="Korte tekst bovenaan de productpagina…"
                value={wcShortHtml}
                onChange={setWcShortHtml}
                imageFolder="products"
                onImageError={setError}
              />
            </div>
            <div>
              <label className={labelClass}>Volledige omschrijving</label>
              <AdminHtmlEditor
                minHeight="tall"
                placeholder="Uitgebreide producttekst…"
                value={wcDescHtml}
                onChange={setWcDescHtml}
                imageFolder="products"
                onImageError={setError}
              />
            </div>
          </div>

          <div className="admin-panel-surface">
            <h2 className="admin-section-title">Zichtbaarheid &amp; levering</h2>
            <div className="admin-mb-1">
              <label className={labelClass}>Status</label>
              <select
                className={fieldClass}
                value={productStatus}
                onChange={(e) => {
                  const next = normalizeProductStatus(e.target.value);
                  setProductStatus(next);
                  if (next === "concept") {
                    setFeaturedOnHomepage(false);
                  }
                }}
              >
                {PRODUCT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PRODUCT_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <p className="admin-muted admin-m-0 admin-mt-05 admin-text-sm">
                Concept = verborgen in de shop, zoekresultaten en sitemap.
              </p>
            </div>
            <div className="admin-inline-checks">
              <label className="admin-check-highlight">
                <input
                  type="checkbox"
                  checked={featuredOnHomepage}
                  disabled={productStatus === "concept"}
                  onChange={(e) => setFeaturedOnHomepage(e.target.checked)}
                />
                Uitgelicht op de homepage
              </label>
              <div className="admin-stock-readout admin-form-grid-2 admin-span-2">
                <div>
                  <label className={labelClass}>Voorraad (aantal)</label>
                  <input
                    className={fieldClass}
                    type="number"
                    min={0}
                    step={1}
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    placeholder="bijv. 12"
                  />
                </div>
                <div>
                  <label className={labelClass}>Voorraadstatus</label>
                  <select
                    className={fieldClass}
                    value={hasStockNumber ? (stockAvailable! > 0 ? "in" : "out") : inStockManual ? "in" : "out"}
                    disabled={hasStockNumber}
                    onChange={(e) => setInStockManual(e.target.value === "in")}
                  >
                    <option value="in">Op voorraad</option>
                    <option value="out">Uitverkocht</option>
                  </select>
                  <p className="admin-muted admin-m-0 admin-mt-05 admin-text-sm">
                    {hasStockNumber
                      ? "Volgt automatisch het aantal hierboven."
                      : "Geldt zolang er geen aantal is ingevuld."}
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Gereserveerd</label>
                  <input
                    className={fieldClass}
                    type="number"
                    min={0}
                    step={1}
                    value={reservedQty}
                    onChange={(e) => setReservedQty(e.target.value)}
                  />
                </div>
                <div>
                  <p className="admin-label admin-m-0">Beschikbaar</p>
                  <p className="admin-m-0">
                    {stockAvailable != null ? (
                      <strong>{stockAvailable}</strong>
                    ) : (
                      <span className="admin-muted">—</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Easy Sales product-ID</label>
                  <input
                    className={fieldClass}
                    type="number"
                    min={1}
                    step={1}
                    value={easySalesId}
                    onChange={(e) => setEasySalesId(e.target.value)}
                    placeholder="uit Easy Sales"
                  />
                </div>
                {initial.stockSyncedAt ? (
                  <p className="admin-muted admin-m-0 admin-text-sm admin-span-2">
                    Laatste Easy Sales-sync:{" "}
                    {new Date(initial.stockSyncedAt).toLocaleString("nl-NL")}
                    {initial.easySalesSku ? ` · ES SKU ${initial.easySalesSku}` : ""}
                  </p>
                ) : (
                  <p className="admin-muted admin-m-0 admin-text-sm admin-span-2">
                    Niet gekoppeld aan Easy Sales — vul de voorraad hier handmatig in of beheer die via{" "}
                    <Link href="/admin/inventory" className="admin-link-action">
                      Voorraad
                    </Link>
                    .
                  </p>
                )}
              </div>
              <label>
                <input type="checkbox" checked={freeCargo} onChange={(e) => setFreeCargo(e.target.checked)} />
                Gratis verzending
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={sameDayShipping}
                  onChange={(e) => setSameDayShipping(e.target.checked)}
                />
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
                <input
                  type="checkbox"
                  checked={hasFlashSaleTag}
                  onChange={(e) => setHasFlashSaleTag(e.target.checked)}
                />
                Tag: flash sale
              </label>
            </div>
          </div>

          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">SEO &amp; meta</h2>
            <label className={labelClass}>SEO-titel</label>
            <input className={fieldClass} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
            <label className={labelClass}>Meta description</label>
            <textarea className={fieldClass} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
            <label className={labelClass}>Open Graph titel</label>
            <input className={fieldClass} value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} />
            <label className={labelClass}>Open Graph tekst</label>
            <textarea className={fieldClass} value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} />
            <label className={labelClass}>Social image URL</label>
            <input className={fieldClass} value={socialImage} onChange={(e) => setSocialImage(e.target.value)} />
            <div className="admin-form-actions">
              <AdminImageUploadButton
                label="Uploaden"
                folder="products"
                onUploaded={(url) => {
                  setError("");
                  setSocialImage(url);
                }}
                onError={(message) => setError(message)}
              />
            </div>
            <label className={labelClass}>Alt-tekst hoofdfoto</label>
            <input className={fieldClass} value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
            <label className="admin-check-highlight">
              <input type="checkbox" checked={noindex} onChange={(e) => setNoindex(e.target.checked)} />
              Niet indexeren (noindex)
            </label>
          </div>

          <details className="admin-panel-surface admin-stack-tight">
            <summary className="admin-section-summary">Geavanceerd (JSON)</summary>
            <div className="admin-mt-1 admin-stack-tight">
              <div>
                <label className={labelClass}>Variaties (JSON-array, optioneel)</label>
                <textarea
                  className={`${fieldClass} admin-field--mono admin-field--tall-lg`}
                  value={variationsJson}
                  onChange={(e) => setVariationsJson(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div>
                <label className={labelClass}>Landingpromo (JSON)</label>
                <textarea
                  className={`${fieldClass} admin-field--mono admin-field--tall-lg`}
                  value={landingJson}
                  onChange={(e) => setLandingJson(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div>
                <label className={labelClass}>Winkelwagenbundels (JSON)</label>
                <textarea
                  className={`${fieldClass} admin-field--mono admin-field--tall-xl`}
                  value={bundleJson}
                  onChange={(e) => setBundleJson(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </div>
          </details>
        </div>

        <aside className="admin-product-editor-side" aria-label="Media en prijzen">
          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">Media</h2>
            <div className="admin-media-row admin-media-stack--aside">
              {imagePreviewOk ? (
                <div className="admin-thumb-preview-wrap admin-thumb-preview-wrap--hero">
                  <img src={imageTrim} alt="" />
                </div>
              ) : (
                <div className="admin-thumb-preview-wrap admin-thumb-preview-wrap--hero opacity-40" aria-hidden />
              )}
              <div className="admin-media-actions">
                <AdminImageUploadButton
                  label="Upload hoofdfoto"
                  folder="products"
                  onUploaded={(uploadedUrl, alt) => {
                    setError("");
                    const prevMain = image.trim();
                    setImage(uploadedUrl);
                    if (alt?.trim()) {
                      setImageAlt((prev) => (prev.trim() ? prev : alt.trim()));
                    }
                    if (prevMain && isPreviewableImageUrl(prevMain) && prevMain !== uploadedUrl) {
                      setImagesText((prev) => appendImageUrls(prev, prevMain));
                    }
                  }}
                  onError={(message) => setError(message)}
                />
                <AdminImageUploadButton
                  label="Upload extra foto’s"
                  folder="products"
                  multiple
                  onUploaded={(uploadedUrl) => {
                    setError("");
                    setImagesText((prev) => appendImageUrls(prev, uploadedUrl));
                  }}
                  onError={(message) => setError(message)}
                />
                <button type="button" className="admin-btn-secondary" onClick={handleChangeMainPhoto}>
                  Plak hoofdfoto-URL
                </button>
                <button type="button" className="admin-btn-secondary" onClick={handleAddImages}>
                  Plak extra URL’s
                </button>
              </div>
              <div className="min-w-0 flex-1 admin-stack-tight">
                <div>
                  <label className={labelClass}>Hoofdfoto (URL)</label>
                  <input
                    ref={mainImageInputRef}
                    className={fieldClass}
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Extra foto’s (één URL per regel)</label>
                  <textarea
                    className={`${fieldClass} admin-field--mono admin-field--tall`}
                    value={imagesText}
                    onChange={(e) => setImagesText(e.target.value)}
                  />
                </div>
                {extraImageUrls.length > 0 ? (
                  <div>
                    <p className="admin-muted admin-m-0" style={{ fontSize: "0.72rem" }}>
                      Extra previews — klik om als hoofdfoto te gebruiken (vorige hoofdfoto gaat naar de lijst).
                    </p>
                    <div className="admin-extra-thumbs" role="list">
                      {extraImageUrls.map((url) => (
                        <button
                          key={url}
                          type="button"
                          className="admin-extra-thumb"
                          title="Als hoofdfoto instellen"
                          onClick={() => handlePromoteExtraToMain(url)}
                        >
                          <img src={url} alt="" loading="lazy" decoding="async" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">Prijzen</h2>
            <div className="admin-form-grid">
              <div>
                <label className={labelClass}>Valuta</label>
                <input className={fieldClass} value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Huidige prijs</label>
                <input
                  className={fieldClass}
                  inputMode="decimal"
                  value={priceCurrent}
                  onChange={(e) => setPriceCurrent(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Prijs na korting</label>
                <input
                  className={fieldClass}
                  inputMode="decimal"
                  value={priceDiscounted}
                  onChange={(e) => setPriceDiscounted(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Oude prijs (0 = geen)</label>
                <input
                  className={fieldClass}
                  inputMode="decimal"
                  value={priceOld}
                  onChange={(e) => setPriceOld(e.target.value)}
                />
              </div>
              <div className="admin-span-2">
                <label className={labelClass}>Kortingslabel</label>
                <input className={fieldClass} value={discountName} onChange={(e) => setDiscountName(e.target.value)} />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="admin-editor-sticky">
        <div className="admin-editor-sticky-inner">
          <span className="admin-muted" style={{ fontSize: "0.8rem" }}>
            ID {id}
            {payload ? "" : " · controleer invoer"}
          </span>
          <div className="admin-form-actions">
            <button type="button" onClick={save} disabled={saving} className="admin-btn-primary">
              {saving ? "Opslaan…" : "Opslaan"}
            </button>
            <button type="button" onClick={remove} disabled={deleting} className="admin-btn-danger">
              {deleting ? "…" : "Verwijderen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
