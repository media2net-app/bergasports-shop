"use client";

import { useState } from "react";

import { formatProductPrice } from "@/lib/products";

type ShippingRate = {
  id: string;
  countryCode: string;
  label: string;
  method: string;
  price: number;
  freeAbove: number | null;
  estimatedDays: string | null;
  active: boolean;
  sortOrder: number;
};

export default function AdminShippingRatesPanel({ initialRates }: { initialRates: ShippingRate[] }) {
  const [rates, setRates] = useState(initialRates);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [countryCode, setCountryCode] = useState("NL");
  const [label, setLabel] = useState("");
  const [method, setMethod] = useState("standard");
  const [price, setPrice] = useState("6.95");
  const [estimatedDays, setEstimatedDays] = useState("1–3 werkdagen");
  const [freeAbove, setFreeAbove] = useState("");

  async function seedDefaults() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/shipping-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: true }),
      });
      const data = (await res.json()) as { rates?: ShippingRate[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Laden mislukt");
      } else {
        setRates(data.rates ?? []);
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function createRate() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/shipping-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode,
          label,
          method,
          price: Number(price),
          estimatedDays,
          freeAbove: freeAbove.trim() ? Number(freeAbove) : null,
        }),
      });
      const data = (await res.json()) as { rate?: ShippingRate; error?: string };
      if (!res.ok || !data.rate) {
        setError(data.error ?? "Aanmaken mislukt");
      } else {
        setRates((prev) => [...prev, data.rate!]);
        setLabel("");
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function toggleActive(rate: ShippingRate) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/shipping-rates/${rate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !rate.active }),
      });
      const data = (await res.json()) as { rate?: ShippingRate; error?: string };
      if (!res.ok || !data.rate) {
        setError(data.error ?? "Bijwerken mislukt");
      } else {
        setRates((prev) => prev.map((r) => (r.id === rate.id ? data.rate! : r)));
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function removeRate(rate: ShippingRate) {
    if (!window.confirm(`Tarief “${rate.label}” verwijderen?`)) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/shipping-rates/${rate.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verwijderen mislukt");
      } else {
        setRates((prev) => prev.filter((r) => r.id !== rate.id));
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  return (
    <div className="admin-stack">
      {error ? <div className="admin-error-box">{error}</div> : null}

      {rates.length === 0 ? (
        <div className="admin-panel admin-stack-tight">
          <p className="admin-muted admin-m-0">
            Nog geen tarieven in de database. Checkout gebruikt nu de standaardprijzen (NL € 6,95, BE €
            12,95, …).
          </p>
          <button type="button" className="admin-btn-primary admin-w-fit" disabled={busy} onClick={() => void seedDefaults()}>
            {busy ? "Bezig…" : "Standaardtarieven laden"}
          </button>
        </div>
      ) : null}

      <form
        className="admin-settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          void createRate();
        }}
      >
        <header className="admin-settings-form-head">
          <div>
            <h2 className="admin-settings-form-title">Nieuw tarief</h2>
            <p className="admin-settings-form-intro">Landcode zoals NL, BE, DE of EU als vangnet.</p>
          </div>
        </header>
        <div className="admin-settings-form-grid">
          <div className="admin-settings-field">
            <label className="admin-settings-field-label" htmlFor="ship-cc">
              Land
            </label>
            <input
              id="ship-cc"
              className="admin-field admin-field--flush"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              maxLength={2}
              required
            />
          </div>
          <div className="admin-settings-field">
            <label className="admin-settings-field-label" htmlFor="ship-method">
              Methode
            </label>
            <select
              id="ship-method"
              className="admin-field admin-field--flush"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="standard">standard</option>
              <option value="pickup">pickup</option>
              <option value="express">express</option>
            </select>
          </div>
          <div className="admin-settings-field is-wide">
            <label className="admin-settings-field-label" htmlFor="ship-label">
              Label
            </label>
            <input
              id="ship-label"
              className="admin-field admin-field--flush"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Verzending Nederland"
              required
            />
          </div>
          <div className="admin-settings-field">
            <label className="admin-settings-field-label" htmlFor="ship-price">
              Prijs (€)
            </label>
            <input
              id="ship-price"
              className="admin-field admin-field--flush"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="admin-settings-field">
            <label className="admin-settings-field-label" htmlFor="ship-days">
              Levertijd
            </label>
            <input
              id="ship-days"
              className="admin-field admin-field--flush"
              value={estimatedDays}
              onChange={(e) => setEstimatedDays(e.target.value)}
            />
          </div>
          <div className="admin-settings-field">
            <label className="admin-settings-field-label" htmlFor="ship-free">
              Gratis vanaf (€)
            </label>
            <input
              id="ship-free"
              className="admin-field admin-field--flush"
              type="number"
              min="0"
              step="0.01"
              value={freeAbove}
              onChange={(e) => setFreeAbove(e.target.value)}
              placeholder="Leeg = shopdrempel"
            />
          </div>
        </div>
        <footer className="admin-settings-form-foot">
          <button type="submit" className="admin-btn-primary" disabled={busy}>
            {busy ? "Bezig…" : "Tarief toevoegen"}
          </button>
        </footer>
      </form>

      {rates.length > 0 ? (
        <div className="admin-panel admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Land</th>
                <th>Label</th>
                <th>Prijs</th>
                <th>Levertijd</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={rate.id}>
                  <td>
                    <code>{rate.countryCode}</code>
                    <div className="admin-muted">{rate.method}</div>
                  </td>
                  <td>{rate.label}</td>
                  <td>
                    {formatProductPrice(rate.price, "EUR")}
                    {rate.freeAbove != null ? (
                      <div className="admin-muted">gratis vanaf {formatProductPrice(rate.freeAbove, "EUR")}</div>
                    ) : null}
                  </td>
                  <td className="admin-muted">{rate.estimatedDays ?? "—"}</td>
                  <td>
                    <span className="admin-badge-src">{rate.active ? "Actief" : "Uit"}</span>
                  </td>
                  <td className="admin-td-right">
                    <button
                      type="button"
                      className="admin-link-action"
                      disabled={busy}
                      onClick={() => void toggleActive(rate)}
                    >
                      {rate.active ? "Uitzetten" : "Activeren"}
                    </button>
                    {" · "}
                    <button
                      type="button"
                      className="admin-link-action"
                      disabled={busy}
                      onClick={() => void removeRate(rate)}
                    >
                      Verwijderen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
