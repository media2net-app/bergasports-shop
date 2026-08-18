"use client";

import { useMemo, useState } from "react";

import AdminImageUploadControl from "@/components/admin/AdminImageUploadControl";
import type { ShopBrand } from "@/lib/brands-shared";
import { brandSlugFromName } from "@/lib/brands-shared";

type Props = {
  initialBrands: ShopBrand[];
};

export default function AdminBrandsPanel({ initialBrands }: Props) {
  const [brands, setBrands] = useState(initialBrands);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [visible, setVisible] = useState(true);

  const visibleCount = useMemo(() => brands.filter((b) => b.visible).length, [brands]);

  async function createBrand() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug.trim() || undefined,
          logoUrl: logoUrl.trim() || null,
          visible,
        }),
      });
      const data = (await res.json()) as { brand?: ShopBrand; error?: string };
      if (!res.ok || !data.brand) {
        setError(data.error ?? "Aanmaken mislukt");
        setBusy(false);
        return;
      }
      setBrands((prev) => [...prev, data.brand!].sort((a, b) => a.name.localeCompare(b.name, "nl")));
      setName("");
      setSlug("");
      setSlugTouched(false);
      setLogoUrl("");
      setVisible(true);
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function patch(id: number, body: Record<string, unknown>) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/brands/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { brand?: ShopBrand; error?: string };
      if (!res.ok || !data.brand) {
        setError(data.error ?? "Bijwerken mislukt");
      } else {
        setBrands((prev) => prev.map((b) => (b.id === id ? data.brand! : b)));
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function remove(brand: ShopBrand) {
    if (!window.confirm(`Merk “${brand.name}” verwijderen? Producten houden de naam, maar zijn niet meer gekoppeld.`)) {
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/brands/${brand.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verwijderen mislukt");
      } else {
        setBrands((prev) => prev.filter((b) => b.id !== brand.id));
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  return (
    <div className="admin-stack">
      {error ? <div className="admin-error-box">{error}</div> : null}

      <form
        className="admin-settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          void createBrand();
        }}
      >
        <header className="admin-settings-form-head">
          <div>
            <h2 className="admin-settings-form-title">Nieuw merk</h2>
            <p className="admin-settings-form-intro">
              {visibleCount} zichtbaar in de shopfilter. {brands.length} in totaal.
            </p>
          </div>
        </header>
        <div className="admin-settings-form-grid">
          <div className="admin-settings-field">
            <label className="admin-settings-field-label" htmlFor="brand-name">
              Naam
            </label>
            <input
              id="brand-name"
              className="admin-field admin-field--flush"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(brandSlugFromName(e.target.value));
              }}
              placeholder="Orbea"
              required
            />
          </div>
          <div className="admin-settings-field">
            <label className="admin-settings-field-label" htmlFor="brand-slug">
              Slug
            </label>
            <input
              id="brand-slug"
              className="admin-field admin-field--flush"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(brandSlugFromName(e.target.value) || e.target.value);
              }}
              placeholder="orbea"
            />
          </div>
          <div className="admin-settings-field">
            <label className="admin-settings-field-label" htmlFor="brand-logo">
              Logo-URL (optioneel)
            </label>
            <input
              id="brand-logo"
              className="admin-field admin-field--flush"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
            />
            <div className="admin-mt-05">
              <AdminImageUploadControl
                label="Logo uploaden"
                folder="uploads"
                variant="button"
                onUploaded={(url) => setLogoUrl(url)}
              />
            </div>
          </div>
          <label className="admin-check-highlight" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
            Zichtbaar in de shop
          </label>
        </div>
        <footer className="admin-settings-form-foot">
          <button type="submit" className="admin-btn-primary" disabled={busy || !name.trim()}>
            {busy ? "Bezig…" : "Merk toevoegen"}
          </button>
        </footer>
      </form>

      <div className="admin-panel-surface admin-stack-tight">
        <h3 className="admin-section-title">Merken</h3>
        {brands.length === 0 ? (
          <p className="admin-muted admin-m-0">Nog geen merken. Voeg er een toe, of sla een product op met een merk.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Slug</th>
                  <th>Logo</th>
                  <th>Zichtbaar</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => (
                  <tr key={brand.id}>
                    <td>
                      <input
                        className="admin-field"
                        defaultValue={brand.name}
                        aria-label={`Naam ${brand.name}`}
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (next && next !== brand.name) void patch(brand.id, { name: next });
                        }}
                      />
                    </td>
                    <td>
                      <code>{brand.slug}</code>
                    </td>
                    <td>
                      {brand.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={brand.logoUrl} alt="" width={36} height={36} style={{ objectFit: "contain" }} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={brand.visible}
                        aria-label={`${brand.name} zichtbaar`}
                        onChange={() => void patch(brand.id, { visible: !brand.visible })}
                        disabled={busy}
                      />
                    </td>
                    <td className="admin-td-right">
                      <button type="button" className="admin-link-action" disabled={busy} onClick={() => void remove(brand)}>
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
