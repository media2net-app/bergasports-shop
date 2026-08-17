"use client";

import { useEffect, useRef, useState } from "react";

import {
  folderLabel,
  mergeMediaAlts,
  metaBits,
  optimisticMediaAsset,
  type MediaAssetClient,
} from "@/components/admin/admin-media";
import AdminImageUploadControl from "@/components/admin/AdminImageUploadControl";
import AdminMediaGrid from "@/components/admin/AdminMediaGrid";

export type { MediaAssetClient };

export default function AdminMediaLibrary({ initialAssets }: { initialAssets: MediaAssetClient[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [assets, setAssets] = useState(initialAssets);
  const [alts, setAlts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialAssets.map((a) => [a.id, a.alt ?? ""])),
  );
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("");
  const [previewId, setPreviewId] = useState("");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  const preview = previewId ? (assets.find((asset) => asset.id === previewId) ?? null) : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (preview) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [preview]);

  async function refreshAssets() {
    try {
      const res = await fetch("/api/admin/media");
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { assets?: MediaAssetClient[] };
      if (!data.assets) {
        return;
      }
      setAssets(data.assets);
      setAlts((prev) => mergeMediaAlts(prev, data.assets ?? []));
    } catch {
      /* houd optimistische lijst */
    }
  }

  async function saveAlt(id: string) {
    setError("");
    setSavingId(id);
    try {
      const res = await fetch("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, alt: alts[id] ?? "" }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Alt-tekst opslaan mislukt");
      } else {
        setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, alt: alts[id] || null } : a)));
      }
    } catch {
      setError("Geen verbinding");
    }
    setSavingId("");
  }

  function copyUrl(url: string) {
    void navigator.clipboard.writeText(url);
    setCopied(url);
    window.setTimeout(() => setCopied(""), 1500);
  }

  function closePreview() {
    setPreviewId("");
  }

  const previewMeta = preview ? metaBits(preview, true) : [];

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">Media</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Sleep foto&apos;s hierheen of upload ze voor producten, pagina&apos;s en nieuws. Klik op een
            miniatuur om te bekijken of de URL te kopiëren.
          </p>
        </div>
      </div>

      <AdminImageUploadControl
        variant="dropzone"
        label="Sleep bestanden hierheen of klik om te kiezen"
        folder="uploads"
        multiple
        onUploaded={(url) => {
          setError("");
          setAssets((prev) => [optimisticMediaAsset(url), ...prev]);
        }}
        onBatchComplete={() => {
          void refreshAssets();
        }}
        onError={setError}
      />

      {error ? <p className="admin-error-box">{error}</p> : null}

      <AdminMediaGrid
        assets={assets}
        query={query}
        folder={folder}
        onQueryChange={setQuery}
        onFolderChange={setFolder}
        onItemClick={(asset) => setPreviewId(asset.id)}
        activeId={previewId}
        hoverLabel="Bekijken"
      />

      <dialog
        ref={dialogRef}
        className="admin-media-lightbox"
        aria-labelledby="admin-media-lightbox-title"
        onClose={closePreview}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closePreview();
          }
        }}
      >
        {preview ? (
          <div className="admin-media-lightbox-panel">
            <div className="admin-media-lightbox-figure">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url} alt={preview.alt || preview.filename} />
            </div>
            <div className="admin-media-lightbox-side">
              <h2 id="admin-media-lightbox-title" className="admin-panel-title admin-m-0" title={preview.filename}>
                {preview.filename}
              </h2>
              <p className="admin-muted admin-m-0">
                {[folderLabel(preview.folder), ...previewMeta].filter(Boolean).join(" · ")}
              </p>
              <div className="admin-tools-row">
                <button type="button" className="admin-btn-secondary" onClick={() => copyUrl(preview.url)}>
                  {copied === preview.url ? "Gekopieerd" : "Kopieer URL"}
                </button>
                <a className="admin-link-action" href={preview.url} target="_blank" rel="noreferrer">
                  Openen
                </a>
              </div>
              {!preview.id.startsWith("local-") ? (
                <div className="admin-stack-tight">
                  <label className="admin-label" htmlFor="admin-media-alt">
                    Alt-tekst
                  </label>
                  <input
                    id="admin-media-alt"
                    className="admin-field admin-field--flush"
                    placeholder="Beschrijf de afbeelding"
                    value={alts[preview.id] ?? ""}
                    onChange={(e) => setAlts((prev) => ({ ...prev, [preview.id]: e.target.value }))}
                    onBlur={() => {
                      void saveAlt(preview.id);
                    }}
                  />
                  <button
                    type="button"
                    className="admin-link-action"
                    disabled={savingId === preview.id}
                    onClick={() => void saveAlt(preview.id)}
                  >
                    {savingId === preview.id ? "Opslaan…" : "Alt opslaan"}
                  </button>
                </div>
              ) : null}
              <button type="button" className="admin-btn-secondary" onClick={closePreview}>
                Sluiten
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
