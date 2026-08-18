"use client";

import { useMemo, useState } from "react";

import DateTimePicker from "@/components/ui/DateTimePicker";
import { isoToLocalDateValue } from "@/lib/datetime-picker";
import { formatProductPrice } from "@/lib/products";

type AdminCoupon = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  amount: number;
  minSubtotal: number | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

function formatDay(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL");
}

function couponValueLabel(coupon: AdminCoupon): string {
  if (coupon.type === "fixed") {
    return formatProductPrice(coupon.amount, "EUR");
  }
  return `${coupon.amount}%`;
}

export default function AdminCouponsPanel({ initialCoupons }: { initialCoupons: AdminCoupon[] }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [amount, setAmount] = useState("10");
  const [minSubtotal, setMinSubtotal] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const activeCount = useMemo(() => coupons.filter((c) => c.active).length, [coupons]);

  async function createCoupon() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          type,
          amount: Number(amount),
          minSubtotal: minSubtotal.trim() ? Number(minSubtotal) : null,
          endsAt: endsAt.trim() || null,
        }),
      });
      const data = (await res.json()) as { coupon?: AdminCoupon; error?: string };
      if (!res.ok || !data.coupon) {
        setError(data.error ?? "Aanmaken mislukt");
        setBusy(false);
        return;
      }
      setCoupons((prev) => [data.coupon!, ...prev]);
      setCode("");
      setAmount("10");
      setMinSubtotal("");
      setEndsAt("");
      setType("percent");
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function toggleActive(coupon: AdminCoupon) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !coupon.active }),
      });
      const data = (await res.json()) as { coupon?: AdminCoupon; error?: string };
      if (!res.ok || !data.coupon) {
        setError(data.error ?? "Bijwerken mislukt");
      } else {
        setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? data.coupon! : c)));
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function removeCoupon(coupon: AdminCoupon) {
    if (!window.confirm(`Code ${coupon.code} verwijderen?`)) {
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verwijderen mislukt");
      } else {
        setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
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
          void createCoupon();
        }}
      >
        <header className="admin-settings-form-head">
          <div>
            <h2 className="admin-settings-form-title">Nieuwe code</h2>
            <p className="admin-settings-form-intro">
              Klanten vullen de code in bij checkout. {activeCount} actief.
            </p>
          </div>
        </header>
        <div className="admin-settings-form-grid">
          <div className="admin-settings-field">
            <label className="admin-settings-field-label" htmlFor="coupon-code">
              Code
            </label>
            <input
              id="coupon-code"
              className="admin-field admin-field--flush"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="TERUG10"
              required
            />
          </div>
          <div className="admin-settings-field">
            <label className="admin-settings-field-label" htmlFor="coupon-type">
              Type
            </label>
            <select
              id="coupon-type"
              className="admin-field admin-field--flush"
              value={type}
              onChange={(e) => setType(e.target.value === "fixed" ? "fixed" : "percent")}
            >
              <option value="percent">Percentage</option>
              <option value="fixed">Vast bedrag (€)</option>
            </select>
          </div>
          <div className="admin-settings-field">
            <label className="admin-settings-field-label" htmlFor="coupon-amount">
              {type === "fixed" ? "Bedrag (€)" : "Percentage"}
            </label>
            <input
              id="coupon-amount"
              className="admin-field admin-field--flush"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="admin-settings-field">
            <label className="admin-settings-field-label" htmlFor="coupon-min">
              Min. subtotaal (€)
            </label>
            <input
              id="coupon-min"
              className="admin-field admin-field--flush"
              type="number"
              min="0"
              step="0.01"
              value={minSubtotal}
              onChange={(e) => setMinSubtotal(e.target.value)}
              placeholder="Optioneel"
            />
          </div>
          <div className="admin-settings-field">
            <label className="admin-settings-field-label" htmlFor="coupon-ends">
              Geldig tot
            </label>
              <DateTimePicker
                id="coupon-ends"
                variant="admin"
                mode="date"
                value={endsAt}
                onChange={setEndsAt}
                min={isoToLocalDateValue(new Date())}
                placeholder="Kies een einddatum"
              />
          </div>
        </div>
        <footer className="admin-settings-form-foot">
          <button type="submit" className="admin-btn-primary" disabled={busy}>
            {busy ? "Bezig…" : "Code toevoegen"}
          </button>
        </footer>
      </form>

      <div className="admin-panel admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Korting</th>
              <th>Min.</th>
              <th>Geldig tot</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-muted">
                  Nog geen kortingscodes.
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td>
                    <code>{coupon.code}</code>
                  </td>
                  <td>{couponValueLabel(coupon)}</td>
                  <td className="admin-muted">
                    {coupon.minSubtotal != null ? formatProductPrice(coupon.minSubtotal, "EUR") : "—"}
                  </td>
                  <td className="admin-muted">{formatDay(coupon.endsAt)}</td>
                  <td>
                    <span className="admin-badge-src">{coupon.active ? "Actief" : "Uit"}</span>
                  </td>
                  <td className="admin-td-right">
                    <button
                      type="button"
                      className="admin-link-action"
                      disabled={busy}
                      onClick={() => void toggleActive(coupon)}
                    >
                      {coupon.active ? "Uitzetten" : "Activeren"}
                    </button>
                    {" · "}
                    <button
                      type="button"
                      className="admin-link-action"
                      disabled={busy}
                      onClick={() => void removeCoupon(coupon)}
                    >
                      Verwijderen
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
