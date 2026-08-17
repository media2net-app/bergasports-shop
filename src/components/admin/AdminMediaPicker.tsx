"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  optimisticMediaAsset,
  type AdminUploadFolder,
  type MediaAssetClient,
} from "@/components/admin/admin-media";
import AdminImageUploadControl from "@/components/admin/AdminImageUploadControl";
import AdminMediaGrid from "@/components/admin/AdminMediaGrid";

export type AdminMediaPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, alt?: string | null) => void;
  folder?: AdminUploadFolder;
};

export default function AdminMediaPicker({
  open,
  onClose,
  onSelect,
  folder = "uploads",
}: AdminMediaPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [assets, setAssets] = useState<MediaAssetClient[]>([]);
  const [query, setQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refreshAssets() {
    try {
      const res = await fetch("/api/admin/media");
      if (!res.ok) {
        setError("Bibliotheek laden mislukt");
        return;
      }
      const data = (await res.json()) as { assets?: MediaAssetClient[] };
      setAssets(data.assets ?? []);
    } catch {
      setError("Geen verbinding");
    } finally {
      setLoading(false);
    }
  }

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    dialogRef.current?.showModal();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/media");
        if (cancelled) {
          return;
        }
        if (!res.ok) {
          setError("Bibliotheek laden mislukt");
          return;
        }
        const data = (await res.json()) as { assets?: MediaAssetClient[] };
        setAssets(data.assets ?? []);
      } catch {
        if (!cancelled) {
          setError("Geen verbinding");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function choose(asset: MediaAssetClient) {
    onSelect(asset.url, asset.alt);
    onClose();
  }

  if (!open) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="admin-media-picker"
      aria-labelledby="admin-media-picker-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="admin-media-picker-panel">
        <div className="admin-media-picker-head">
          <div>
            <h2 id="admin-media-picker-title" className="admin-panel-title admin-m-0">
              Kies uit bibliotheek
            </h2>
            <p className="admin-muted admin-m-0 admin-mt-05">
              Klik op een foto om die te gebruiken, of sleep een nieuw bestand hierheen.
            </p>
          </div>
          <button type="button" className="admin-btn-secondary" onClick={onClose}>
            Sluiten
          </button>
        </div>
        <div className="admin-media-picker-body">
          <AdminImageUploadControl
            variant="dropzone"
            className="admin-dropzone--compact"
            label="Sleep bestanden hierheen of klik om te kiezen"
            folder={folder}
            multiple
            onUploaded={(url) => {
              setError("");
              setAssets((prev) => [optimisticMediaAsset(url, folder), ...prev]);
            }}
            onBatchComplete={() => {
              void refreshAssets();
            }}
            onError={setError}
          />
          {error ? <p className="admin-error-box">{error}</p> : null}
          {loading && assets.length === 0 ? (
            <div className="admin-panel-surface">
              <p className="admin-muted admin-m-0">Bibliotheek laden…</p>
            </div>
          ) : (
            <AdminMediaGrid
              assets={assets}
              query={query}
              folder={folderFilter}
              onQueryChange={setQuery}
              onFolderChange={setFolderFilter}
              onItemClick={choose}
              hoverLabel="Kiezen"
            />
          )}
        </div>
      </div>
    </dialog>
  );
}
