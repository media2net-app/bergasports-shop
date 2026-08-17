"use client";

import { useCallback, useEffect, useState } from "react";

import type { AdminRole } from "@/lib/admin-auth";

type AdminUserRow = {
  email: string;
  role: AdminRole;
  created_at: string | null;
};

export default function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("admin");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = (await res.json()) as { users?: AdminUserRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Gebruikers konden niet worden geladen");
        return;
      }
      setError("");
      setUsers(data.users ?? []);
    } catch {
      setError("Geen verbinding met de server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addUser = async () => {
    if (!email.trim() || password.length < 8) {
      setError("Vul een e-mailadres en een wachtwoord van minimaal 8 tekens in");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, role }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Opslaan mislukt");
        return;
      }
      setEmail("");
      setPassword("");
      setRole("admin");
      await load();
    } catch {
      setError("Geen verbinding met de server");
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (userEmail: string, nextRole: AdminRole) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, role: nextRole }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Wijzigen mislukt");
        return;
      }
      await load();
    } catch {
      setError("Geen verbinding met de server");
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async (userEmail: string) => {
    if (!window.confirm(`Gebruiker ${userEmail} verwijderen?`)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users?email=${encodeURIComponent(userEmail)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verwijderen mislukt");
        return;
      }
      await load();
    } catch {
      setError("Geen verbinding met de server");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-stack-tight">
      {error ? <div className="admin-error-box">{error}</div> : null}

      <div className="admin-panel admin-stack-tight">
        <h2 className="admin-panel-title admin-m-0">Nieuwe gebruiker</h2>
        <div className="admin-form-grid">
          <label className="admin-label">
            E-mailadres
            <input
              className="admin-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="admin-label">
            Wachtwoord
            <input
              className="admin-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="admin-label">
            Rol
            <select className="admin-field" value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </select>
          </label>
        </div>
        <button type="button" className="admin-btn-primary" disabled={busy} onClick={() => void addUser()}>
          {busy ? "Opslaan…" : "Gebruiker toevoegen"}
        </button>
      </div>

      <div className="admin-panel admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>E-mailadres</th>
              <th>Rol</th>
              <th>Aangemaakt</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="admin-muted">
                  Laden…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="admin-muted">
                  Nog geen gebruikers.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.email}>
                  <td className="admin-td-mono">{u.email}</td>
                  <td>
                    <select
                      className="admin-field admin-field--compact"
                      value={u.role}
                      disabled={busy}
                      onChange={(e) => void changeRole(u.email, e.target.value as AdminRole)}
                    >
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super admin</option>
                    </select>
                  </td>
                  <td className="admin-muted" style={{ fontSize: "0.8rem" }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("nl-NL") : "—"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn-danger admin-btn-danger--sm"
                      disabled={busy}
                      onClick={() => void removeUser(u.email)}
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
