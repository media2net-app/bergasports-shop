"use client";

import AdminImageUploadButton from "@/components/admin/AdminImageUploadButton";
import type { AdminUploadFolder } from "@/components/admin/admin-media";

function isPreviewableImageUrl(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  if (t.startsWith("/")) return true;
  return /^https?:\/\//i.test(t);
}

export type AdminFeaturedImagePanelProps = {
  image: string;
  alt: string;
  onImageChange: (url: string) => void;
  onAltChange: (alt: string) => void;
  onError?: (message: string) => void;
  folder?: AdminUploadFolder;
  hint: string;
  urlId: string;
  altId: string;
};

export default function AdminFeaturedImagePanel({
  image,
  alt,
  onImageChange,
  onAltChange,
  onError,
  folder = "uploads",
  hint,
  urlId,
  altId,
}: AdminFeaturedImagePanelProps) {
  const imageTrim = image.trim();
  const previewOk = isPreviewableImageUrl(imageTrim);

  function applyImage(url: string, nextAlt?: string | null) {
    onImageChange(url);
    if (nextAlt?.trim() && !alt.trim()) {
      onAltChange(nextAlt.trim());
    }
  }

  return (
    <div className="admin-panel-surface admin-stack-tight">
      <h2 className="admin-section-title">Uitgelichte afbeelding</h2>
      <p className="admin-muted admin-m-0">{hint}</p>
      {previewOk ? (
        <div className="admin-thumb-preview-wrap admin-thumb-preview-wrap--cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageTrim} alt={alt || ""} />
        </div>
      ) : (
        <div className="admin-thumb-preview-wrap admin-thumb-preview-wrap--cover admin-thumb-preview-wrap--empty">
          <span className="admin-muted">Nog geen uitgelichte afbeelding</span>
        </div>
      )}
      <div className="admin-form-actions">
        <AdminImageUploadButton
          label="Uploaden"
          folder={folder}
          onUploaded={(url, nextAlt) => {
            onError?.("");
            applyImage(url, nextAlt);
          }}
          onError={onError}
        />
        {previewOk ? (
          <button
            type="button"
            className="admin-link-action"
            onClick={() => {
              onImageChange("");
            }}
          >
            Foto verwijderen
          </button>
        ) : null}
      </div>
      <div>
        <label className="admin-label" htmlFor={urlId}>
          Foto-URL (optioneel)
        </label>
        <input
          id={urlId}
          className="admin-field admin-field--flush"
          value={image}
          onChange={(e) => onImageChange(e.target.value)}
          placeholder="https://… of /uploads/…"
        />
      </div>
      <div>
        <label className="admin-label" htmlFor={altId}>
          Alt-tekst
        </label>
        <input
          id={altId}
          className="admin-field admin-field--flush"
          value={alt}
          onChange={(e) => onAltChange(e.target.value)}
          placeholder="Korte beschrijving van de foto"
        />
      </div>
    </div>
  );
}
