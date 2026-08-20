"use client";

import { useState } from "react";

import DateTimePicker from "@/components/ui/DateTimePicker";
import { parseOpeningHoursJson, serializeOpeningHours, type OpeningHoursRow } from "@/lib/opening-hours";
import { SHOP_OPENING_HOURS } from "@/lib/site-content";

type AdminOpeningHoursEditorProps = {
  initialJson: string;
};

function toDraft(rows: OpeningHoursRow[]): OpeningHoursRow[] {
  return rows.map((row) => ({ ...row }));
}

export default function AdminOpeningHoursEditor({ initialJson }: AdminOpeningHoursEditorProps) {
  const [rows, setRows] = useState(() => toDraft(parseOpeningHoursJson(initialJson, SHOP_OPENING_HOURS)));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateRow(index: number, patch: Partial<OpeningHoursRow> & { closed?: boolean }) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) {
          return row;
        }
        if (patch.closed === true) {
          return { day: row.day, schemaDay: row.schemaDay, hours: "Gesloten" };
        }
        if (patch.closed === false) {
          const opens = row.opens || "09:00";
          const closes = row.closes || "17:00";
          return { ...row, opens, closes, hours: `${opens} – ${closes}` };
        }
        const next = { ...row, ...patch };
        if (next.opens && next.closes) {
          // Preserve multi-slot labels (e.g. koopavond) unless open/close times changed.
          const multiSlot = row.hours.includes("·");
          const timesUnchanged =
            (!patch.opens || patch.opens === row.opens) && (!patch.closes || patch.closes === row.closes);
          if (!(multiSlot && timesUnchanged)) {
            next.hours = `${next.opens} – ${next.closes}`;
          }
        }
        return next;
      }),
    );
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: { SHOP_OPENING_HOURS_JSON: serializeOpeningHours(rows) } }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Opslaan mislukt");
      } else {
        setMessage("Openingstijden opgeslagen.");
      }
    } catch {
      setError("Geen verbinding");
    }
    setSaving(false);
  }

  return (
    <div className="admin-panel admin-stack-tight">
      <div>
        <h2 className="admin-h2 admin-m-0">Openingstijden</h2>
        <p className="admin-muted admin-m-0 admin-mt-05">
          Deze tabel staat in de footer, op de homepage en in de Google-winkelgegevens. De korte regel
          hierboven blijft apart voor productteksten.
        </p>
      </div>
      {message ? (
        <div className="admin-banner ok admin-m-0" role="status">
          {message}
        </div>
      ) : null}
      {error ? <div className="admin-error-box">{error}</div> : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Dag</th>
              <th>Gesloten</th>
              <th>Open</th>
              <th>Dicht</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const closed = row.hours === "Gesloten" || !row.opens || !row.closes;
              return (
                <tr key={row.schemaDay}>
                  <td>{row.day}</td>
                  <td>
                    <label className="admin-check-highlight">
                      <input
                        type="checkbox"
                        checked={closed}
                        onChange={(e) => updateRow(index, { closed: e.target.checked })}
                      />
                      Gesloten
                    </label>
                  </td>
                  <td>
                    <DateTimePicker
                      variant="admin"
                      mode="time"
                      minuteStep={15}
                      disabled={closed}
                      value={closed ? "" : (row.opens ?? "")}
                      onChange={(opens) => updateRow(index, { opens })}
                      placeholder="Open"
                    />
                  </td>
                  <td>
                    <DateTimePicker
                      variant="admin"
                      mode="time"
                      minuteStep={15}
                      disabled={closed}
                      value={closed ? "" : (row.closes ?? "")}
                      onChange={(closes) => updateRow(index, { closes })}
                      placeholder="Dicht"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" className="admin-btn-primary admin-w-fit" disabled={saving} onClick={() => void save()}>
        {saving ? "Opslaan…" : "Openingstijden opslaan"}
      </button>
    </div>
  );
}
