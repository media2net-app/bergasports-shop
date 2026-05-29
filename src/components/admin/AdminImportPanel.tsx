"use client";

import { useState } from "react";

import AdminRalexImportSection from "@/components/admin/import/AdminRalexImportSection";
import type { RalexCategoriesFile } from "@/lib/ralex-categories";

type ImportSourceId = "ralex" | "trendyol" | "manual";

type ImportSource = {
  id: ImportSourceId;
  label: string;
  description: string;
  enabled: boolean;
};

const IMPORT_SOURCES: ImportSource[] = [
  {
    id: "ralex",
    label: "Bergasports.com",
    description: "WooCommerce · Store API",
    enabled: true,
  },
  {
    id: "trendyol",
    label: "Trendyol",
    description: "Scraper · coming soon",
    enabled: false,
  },
  {
    id: "manual",
    label: "CSV / feed",
    description: "Upload · coming soon",
    enabled: false,
  },
];

type Props = {
  writable: boolean;
  ralexInitial: RalexCategoriesFile;
};

export default function AdminImportPanel({ writable, ralexInitial }: Props) {
  const [activeSource, setActiveSource] = useState<ImportSourceId>("ralex");
  const active = IMPORT_SOURCES.find((s) => s.id === activeSource) ?? IMPORT_SOURCES[0];

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Import</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Pull products from external shops into your Prisma catalog. Add more sources here over time.
          </p>
        </div>
      </div>

      {writable ? (
        <div className="admin-banner ok" role="status">
          Imports write to <strong>Prisma Postgres</strong>. The shop updates as products are saved.
        </div>
      ) : (
        <div className="admin-banner warn" role="status">
          <strong>Read-only.</strong> Set <code>DATABASE_URL</code> to run imports.
        </div>
      )}

      <nav className="admin-import-sources" aria-label="Import sources">
        {IMPORT_SOURCES.map((source) => (
          <button
            key={source.id}
            type="button"
            className={`admin-import-source-card${activeSource === source.id ? " is-active" : ""}${
              !source.enabled ? " is-disabled" : ""
            }`}
            disabled={!source.enabled}
            aria-current={activeSource === source.id ? "true" : undefined}
            onClick={() => source.enabled && setActiveSource(source.id)}
          >
            <span className="admin-import-source-label">{source.label}</span>
            <span className="admin-import-source-desc">{source.description}</span>
            {!source.enabled ? <span className="admin-import-source-badge">Soon</span> : null}
          </button>
        ))}
      </nav>

      <section className="admin-import-source-panel" aria-labelledby="import-source-heading">
        <h2 id="import-source-heading" className="admin-sr-only">
          {active.label} import
        </h2>
        {activeSource === "ralex" ? (
          <AdminRalexImportSection writable={writable} initial={ralexInitial} />
        ) : (
          <div className="admin-panel">
            <p className="admin-muted admin-m-0">
              <strong>{active.label}</strong> import is not configured yet. Use Ralex for now, or add a new connector
              under <code>src/components/admin/import/</code>.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
