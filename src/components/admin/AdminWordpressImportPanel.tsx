"use client";

import { useState } from "react";

import type { WordpressImportResult } from "@/lib/wordpress-import-run";
import type { WordpressImportType } from "@/lib/wordpress-import-shared";

const TYPE_LABELS: { id: WordpressImportType; label: string; needsWoo: boolean; hint: string }[] = [
  {
    id: "products",
    label: "Producten",
    needsWoo: true,
    hint: "SKU/id-match. Easy Sales-voorraad, featured en handmatige specs/SEO blijven staan.",
  },
  {
    id: "categories",
    label: "Categorieën",
    needsWoo: true,
    hint: "Woo-boom mergen op slug of id (fietsen/bikes). Bestaande boom en SEO blijven staan.",
  },
  {
    id: "attributes",
    label: "Eigenschappen",
    needsWoo: true,
    hint: "Woo-attributen → specificaties op het product. Handmatige specs worden niet overschreven.",
  },
  {
    id: "customers",
    label: "Klanten",
    needsWoo: true,
    hint: "Op e-mail. Bestaande wachtwoorden en adressen blijven staan.",
  },
  {
    id: "orders",
    label: "Orders",
    needsWoo: true,
    hint: "Krijgen nummer WC-…. Mollie-betalingen worden niet overschreven.",
  },
  {
    id: "news",
    label: "Nieuws",
    needsWoo: false,
    hint: "Publieke WP REST (geen Woo-sleutels). Lokale berichten zonder WordPress-bron blijven staan.",
  },
  {
    id: "pages",
    label: "Pagina's",
    needsWoo: false,
    hint: "Publieke WP REST. Nieuwe CMS-pagina's; juridische/bestaande slugs worden overgeslagen.",
  },
];

function formatTypeResult(
  label: string,
  row?: { fetched: number; created: number; updated: number; skipped: number },
) {
  if (!row) return null;
  return `${label}: ${row.fetched} opgehaald · ${row.created} nieuw · ${row.updated} bijgewerkt · ${row.skipped} overgeslagen`;
}

export default function AdminWordpressImportPanel({ wooConfigured }: { wooConfigured: boolean }) {
  const [selected, setSelected] = useState<Record<WordpressImportType, boolean>>({
    products: wooConfigured,
    categories: wooConfigured,
    attributes: wooConfigured,
    customers: wooConfigured,
    orders: wooConfigured,
    news: true,
    pages: true,
  });
  const [dryRun, setDryRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<WordpressImportResult | null>(null);

  function toggle(id: WordpressImportType) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function run() {
    const types = TYPE_LABELS.map((t) => t.id).filter((id) => selected[id]);
    if (!types.length) {
      setError("Kies minstens één type.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/wordpress-import", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ types, dryRun }),
      });
      const data = (await res.json()) as WordpressImportResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Netwerkfout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-panel admin-stack-tight">
      <div>
        <h2 className="admin-panel-title admin-m-0">Overnemen van bergasports.com</h2>
        <p className="admin-muted admin-m-0 admin-mt-05">
          Importeer producten, categorieën, eigenschappen, klanten, orders, nieuws en pagina&apos;s vanaf de oude
          WordPress/WooCommerce-site.
          Oude URL&apos;s (productpermalinks, WP-berichten op de root, cart/account, /nl/…) worden als{" "}
          <strong>301-redirects</strong> opgeslagen. Juridische pagina&apos;s en de homepage worden niet omgeleid.
          Producten, klanten en orders vragen REST-sleutels hierboven. Nieuws en pagina&apos;s gaan via de publieke
          WordPress REST API (Woo-sleutels worden níet meegestuurd). Voor concepten:{" "}
          <code>WP_APP_USER</code> / <code>WP_APP_PASSWORD</code>. Voor een volledige catalogus is het script{" "}
          <code>npm run import:wordpress</code> betrouwbaarder (geen time-out).
        </p>
      </div>

      {!wooConfigured ? (
        <p className="admin-muted admin-m-0">
          Nog geen Consumer Key/Secret: alleen nieuws en pagina&apos;s zijn beschikbaar. Zet de sleutels op
          WooCommerce → Instellingen → Geavanceerd → REST API (rechten: Lezen).
        </p>
      ) : null}

      <fieldset className="admin-stack-tight" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="admin-muted" style={{ fontSize: "0.85rem" }}>
          Wat overnemen
        </legend>
        {TYPE_LABELS.map((type) => {
          const disabled = type.needsWoo && !wooConfigured;
          return (
            <label
              key={type.id}
              style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start", cursor: disabled ? "default" : "pointer" }}
            >
              <input
                type="checkbox"
                className="admin-checkbox"
                checked={Boolean(selected[type.id]) && !disabled}
                disabled={disabled || loading}
                onChange={() => toggle(type.id)}
              />
              <span>
                <strong>{type.label}</strong>
                {disabled ? " — REST-sleutels nodig" : null}
                <span className="admin-muted" style={{ display: "block", fontWeight: 400 }}>
                  {type.hint}
                </span>
              </span>
            </label>
          );
        })}
        <label style={{ display: "flex", gap: "0.55rem", alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            className="admin-checkbox"
            checked={dryRun}
            disabled={loading}
            onChange={() => setDryRun((v) => !v)}
          />
          <span>Dry-run (alleen tellen, niets schrijven)</span>
        </label>
      </fieldset>

      {error ? <div className="admin-error-box">{error}</div> : null}
      {result ? (
        <div className="admin-muted admin-stack-tight">
          {result.dryRun ? <p className="admin-m-0">Dry-run — niets opgeslagen.</p> : null}
          {[
            formatTypeResult("Producten", result.products),
            formatTypeResult("Categorieën", result.categories),
            formatTypeResult("Eigenschappen", result.attributes),
            formatTypeResult("Klanten", result.customers),
            formatTypeResult("Orders", result.orders),
            formatTypeResult("Nieuws", result.news),
            formatTypeResult("Pagina's", result.pages),
            formatTypeResult("SEO-redirects (301)", result.redirects),
          ]
            .filter(Boolean)
            .map((line) => (
              <p key={line} className="admin-m-0">
                {line}
              </p>
            ))}
          {result.warnings.map((warning) => (
            <p key={warning} className="admin-m-0">
              {warning}
            </p>
          ))}
          {Object.values(result.errors ?? {}).map((err) => (
            <p key={err} className="admin-error-box admin-m-0">
              {err}
            </p>
          ))}
        </div>
      ) : null}

      <button type="button" className="admin-btn-primary admin-w-fit" disabled={loading} onClick={() => void run()}>
        {loading ? "Bezig met importeren…" : dryRun ? "Dry-run starten" : "Importeren vanaf WordPress"}
      </button>
    </div>
  );
}
