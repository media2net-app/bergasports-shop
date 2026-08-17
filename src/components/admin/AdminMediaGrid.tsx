"use client";

import { useMemo } from "react";

import {
  filterMediaAssets,
  folderLabel,
  metaBits,
  uniqueFolders,
  type MediaAssetClient,
} from "@/components/admin/admin-media";

export type AdminMediaGridProps = {
  assets: MediaAssetClient[];
  query: string;
  folder: string;
  onQueryChange: (query: string) => void;
  onFolderChange: (folder: string) => void;
  onItemClick: (asset: MediaAssetClient) => void;
  activeId?: string;
  hoverLabel?: string;
};

export default function AdminMediaGrid({
  assets,
  query,
  folder,
  onQueryChange,
  onFolderChange,
  onItemClick,
  activeId,
  hoverLabel = "Bekijken",
}: AdminMediaGridProps) {
  const folders = useMemo(() => uniqueFolders(assets), [assets]);
  const visible = useMemo(() => filterMediaAssets(assets, query, folder), [assets, query, folder]);
  const hasSearch = query.trim().length > 0;

  if (assets.length === 0) {
    return (
      <div className="admin-panel-surface">
        <p className="admin-muted admin-m-0">Nog geen bestanden.</p>
        <p className="admin-muted admin-mt-05">Sleep een foto naar het vak hierboven of klik om te uploaden.</p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-panel-surface admin-stack-tight">
        <div className="admin-tools-row">
          <input
            className="admin-search-input"
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Zoek op bestandsnaam…"
            autoComplete="off"
            aria-label="Bestanden zoeken"
          />
        </div>
        {folders.length > 1 ? (
          <div className="admin-filter-tabs admin-media-folder-tabs">
            <button
              type="button"
              className={`admin-filter-tab${folder === "" ? " is-active" : ""}`}
              onClick={() => onFolderChange("")}
            >
              Alles
            </button>
            {folders.map((name) => (
              <button
                key={name}
                type="button"
                className={`admin-filter-tab${folder === name ? " is-active" : ""}`}
                onClick={() => onFolderChange(name)}
              >
                {folderLabel(name)}
              </button>
            ))}
          </div>
        ) : null}
        <div className="admin-stat-inline">
          <span>
            {hasSearch || folder ? (
              <>
                <strong>{visible.length}</strong> van {assets.length}{" "}
                {assets.length === 1 ? "bestand" : "bestanden"}
              </>
            ) : (
              <>
                <strong>{assets.length}</strong> {assets.length === 1 ? "bestand" : "bestanden"}
              </>
            )}
          </span>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="admin-panel-surface">
          <p className="admin-muted admin-m-0">
            {hasSearch ? `Geen bestanden gevonden voor “${query.trim()}”.` : "Geen bestanden in deze map."}
          </p>
        </div>
      ) : (
        <div className="admin-media-grid" role="list">
          {visible.map((asset) => {
            const bits = metaBits(asset);
            const isActive = activeId === asset.id;
            return (
              <article key={asset.id} className="admin-media-card-wrap" role="listitem">
                <button
                  type="button"
                  className={`admin-media-card${isActive ? " is-active" : ""}`}
                  onClick={() => onItemClick(asset)}
                  title={asset.filename}
                >
                  <span className="admin-media-card-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.url} alt={asset.alt || asset.filename} />
                    <span className="admin-media-card-hover">{hoverLabel}</span>
                  </span>
                  <span className="admin-media-card-name">{asset.filename}</span>
                  {bits.length ? <span className="admin-media-card-meta">{bits.join(" · ")}</span> : null}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
