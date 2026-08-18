"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { AdminCustomerAddress, AdminCustomerDetail } from "@/lib/admin-customer-types";
import { formatProductPrice } from "@/lib/products";

type AddressDraft = {
  key: string;
  id?: string;
  label: string;
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
  country: string;
  isDefault: boolean;
};

function toDraft(address: AdminCustomerAddress): AddressDraft {
  return {
    key: address.id,
    id: address.id,
    label: address.label ?? "",
    line1: address.line1,
    line2: address.line2 ?? "",
    postalCode: address.postalCode,
    city: address.city,
    country: address.country || "NL",
    isDefault: address.isDefault,
  };
}

function emptyAddress(): AddressDraft {
  return {
    key: `new-${Date.now()}`,
    label: "",
    line1: "",
    line2: "",
    postalCode: "",
    city: "",
    country: "NL",
    isDefault: false,
  };
}

export default function AdminCustomerEditor({
  customer,
  prefill,
}: {
  customer?: AdminCustomerDetail;
  prefill?: { email?: string; name?: string; phone?: string };
}) {
  const router = useRouter();
  const isNew = !customer;
  const [email, setEmail] = useState(customer?.email ?? prefill?.email ?? "");
  const [name, setName] = useState(customer?.name ?? prefill?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? prefill?.phone ?? "");
  const [password, setPassword] = useState("");
  const [addresses, setAddresses] = useState<AddressDraft[]>(
    customer?.addresses.length ? customer.addresses.map(toDraft) : [],
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const title = useMemo(
    () => (isNew ? "Nieuwe klant" : name.trim() || email || "Klant"),
    [isNew, name, email],
  );

  function updateAddress(key: string, patch: Partial<AddressDraft>) {
    setAddresses((prev) =>
      prev.map((row) => {
        if (row.key !== key) {
          return patch.isDefault ? { ...row, isDefault: false } : row;
        }
        return { ...row, ...patch };
      }),
    );
  }

  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    const payload = {
      email,
      name: name || null,
      phone: phone || null,
      password: password || null,
      addresses: addresses
        .filter((address) => address.line1.trim() || address.city.trim() || address.postalCode.trim())
        .map((address, index) => ({
          id: address.id,
          label: address.label || null,
          line1: address.line1,
          line2: address.line2 || null,
          postalCode: address.postalCode,
          city: address.city,
          country: address.country || "NL",
          isDefault: address.isDefault || index === 0,
        })),
    };
    try {
      const res = await fetch(customer ? `/api/admin/customers/${customer.id}` : "/api/admin/customers", {
        method: customer ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        customer?: AdminCustomerDetail;
        generatedPassword?: string | null;
        error?: string;
      };
      if (!res.ok || !data.customer) {
        setError(data.error ?? "Opslaan mislukt");
        setBusy(false);
        return;
      }
      setPassword("");
      if (isNew) {
        if (data.generatedPassword) {
          setNotice(`Klant aangemaakt. Tijdelijk wachtwoord: ${data.generatedPassword}`);
          setCreatedId(data.customer.id);
          setBusy(false);
          return;
        }
        router.push(`/admin/customers/${data.customer.id}`);
        router.refresh();
        return;
      }
      setNotice("Klant opgeslagen.");
      router.refresh();
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function remove() {
    if (!customer) return;
    if (
      !window.confirm(
        `Account van ${customer.email} verwijderen? Bestellingen blijven bewaard.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verwijderen mislukt");
        setBusy(false);
        return;
      }
      router.push("/admin/customers");
      router.refresh();
    } catch {
      setError("Geen verbinding");
      setBusy(false);
    }
  }

  return (
    <div className="admin-stack">
      <Link href="/admin/customers" className="admin-breadcrumb">
        ← Terug naar klanten
      </Link>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">{title}</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            {isNew
              ? "Maak een webshop-account. Laat wachtwoord leeg om er automatisch één te genereren."
              : `${customer.orderCount} ${customer.orderCount === 1 ? "bestelling" : "bestellingen"}`}
          </p>
        </div>
        <div className="admin-tools-row">
          <button type="button" className="admin-btn-primary" disabled={busy} onClick={() => void save()}>
            {busy ? "Opslaan…" : "Opslaan"}
          </button>
          {!isNew ? (
            <button type="button" className="admin-btn-danger" disabled={busy} onClick={() => void remove()}>
              Account verwijderen
            </button>
          ) : null}
        </div>
      </div>
      {error ? <div className="admin-error-box">{error}</div> : null}
      {notice ? (
        <div className="admin-banner ok admin-m-0" role="status">
          {notice}
          {createdId ? (
            <>
              {" "}
              <Link href={`/admin/customers/${createdId}`} className="admin-link-action">
                Klant openen
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="admin-panel admin-stack-tight">
        <h2 className="admin-h2 admin-m-0">Gegevens</h2>
        <div className="admin-form-grid">
          <label className="admin-label">
            Naam
            <input className="admin-field" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="admin-label">
            E-mail
            <input
              className="admin-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="admin-label">
            Telefoon
            <input className="admin-field" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="admin-label">
            {isNew ? "Wachtwoord (optioneel)" : "Nieuw wachtwoord (optioneel)"}
            <input
              className="admin-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Min. 8 tekens"
            />
          </label>
        </div>
      </div>

      <div className="admin-panel admin-stack-tight">
        <div className="admin-tools-row" style={{ justifyContent: "space-between" }}>
          <h2 className="admin-h2 admin-m-0">Adressen</h2>
          <button
            type="button"
            className="admin-btn-secondary"
            disabled={busy}
            onClick={() => setAddresses((prev) => [...prev, emptyAddress()])}
          >
            Adres toevoegen
          </button>
        </div>
        {addresses.length === 0 ? (
          <p className="admin-muted admin-m-0">Nog geen adressen.</p>
        ) : (
          addresses.map((address) => (
            <div key={address.key} className="admin-form-grid" style={{ paddingTop: "0.5rem" }}>
              <label className="admin-label">
                Label
                <input
                  className="admin-field"
                  value={address.label}
                  onChange={(e) => updateAddress(address.key, { label: e.target.value })}
                  placeholder="Thuis, werk…"
                />
              </label>
              <label className="admin-label admin-span-2">
                Adres
                <input
                  className="admin-field"
                  value={address.line1}
                  onChange={(e) => updateAddress(address.key, { line1: e.target.value })}
                />
              </label>
              <label className="admin-label">
                Extra regel
                <input
                  className="admin-field"
                  value={address.line2}
                  onChange={(e) => updateAddress(address.key, { line2: e.target.value })}
                />
              </label>
              <label className="admin-label">
                Postcode
                <input
                  className="admin-field"
                  value={address.postalCode}
                  onChange={(e) => updateAddress(address.key, { postalCode: e.target.value })}
                />
              </label>
              <label className="admin-label">
                Plaats
                <input
                  className="admin-field"
                  value={address.city}
                  onChange={(e) => updateAddress(address.key, { city: e.target.value })}
                />
              </label>
              <label className="admin-label">
                Land
                <input
                  className="admin-field"
                  value={address.country}
                  onChange={(e) => updateAddress(address.key, { country: e.target.value })}
                />
              </label>
              <label className="admin-label" style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={address.isDefault}
                  onChange={(e) => updateAddress(address.key, { isDefault: e.target.checked })}
                />
                Standaardadres
              </label>
              <div>
                <button
                  type="button"
                  className="admin-btn-danger admin-btn-danger--sm"
                  disabled={busy}
                  onClick={() => setAddresses((prev) => prev.filter((row) => row.key !== address.key))}
                >
                  Adres weg
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {!isNew && customer.lastOrderId ? (
        <div className="admin-panel admin-stack-tight">
          <h2 className="admin-h2 admin-m-0">Bestellingen</h2>
          <p className="admin-muted admin-m-0">
            {customer.orderCount} {customer.orderCount === 1 ? "bestelling" : "bestellingen"}
            {customer.totalSpent
              ? ` · ${formatProductPrice(customer.totalSpent, "EUR")}`
              : ""}
          </p>
          <Link
            href={`/admin/orders?q=${encodeURIComponent(customer.email)}`}
            className="admin-link-action"
          >
            {customer.lastOrderNumber ?? "Bekijk bestellingen"}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
