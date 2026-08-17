"use client";

import { useMemo, useState } from "react";

export type ContactLeadClient = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  kind: string;
  preferredDate: string | null;
  status: string;
  createdAt: string;
};

export default function AdminLeadsPanel({ initialLeads }: { initialLeads: ContactLeadClient[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const newCount = useMemo(() => leads.filter((l) => l.status === "new").length, [leads]);

  async function setStatus(id: string, status: "new" | "handled") {
    setError("");
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Status bijwerken mislukt");
      } else {
        setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, status } : lead)));
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusyId("");
  }

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">Contact &amp; afspraken</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Berichten van het contactformulier en afspraakverzoeken. {newCount} nieuw.
          </p>
        </div>
      </div>
      {error ? <p className="admin-error-box">{error}</p> : null}
      <div className="admin-panel admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Wanneer</th>
              <th>Type</th>
              <th>Naam</th>
              <th>Bericht</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-muted">
                  Nog geen berichten.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="admin-muted admin-text-sm">
                    {new Date(lead.createdAt).toLocaleString("nl-NL", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td>{lead.kind === "appointment" ? "Afspraak" : "Contact"}</td>
                  <td>
                    <div>{lead.name}</div>
                    <div className="admin-muted" style={{ fontSize: "0.8rem" }}>
                      <a href={`mailto:${lead.email}`}>{lead.email}</a>
                      {lead.phone ? ` · ${lead.phone}` : ""}
                    </div>
                    {lead.preferredDate ? (
                      <div className="admin-muted" style={{ fontSize: "0.8rem" }}>
                        Voorkeur: {lead.preferredDate}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ maxWidth: 360, whiteSpace: "pre-wrap" }}>{lead.message}</td>
                  <td>
                    <span className="admin-badge-src">{lead.status === "handled" ? "Afgehandeld" : "Nieuw"}</span>
                  </td>
                  <td className="admin-td-right">
                    {lead.status === "new" ? (
                      <button
                        type="button"
                        className="admin-link-action"
                        disabled={busyId === lead.id}
                        onClick={() => void setStatus(lead.id, "handled")}
                      >
                        Afhandelen
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-link-action"
                        disabled={busyId === lead.id}
                        onClick={() => void setStatus(lead.id, "new")}
                      >
                        Heropenen
                      </button>
                    )}
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
