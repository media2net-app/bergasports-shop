"use client";

import { useCallback, useEffect, useState } from "react";

import type { AdminRole } from "@/lib/admin-auth";

type AdminUserRow = {
  email: string;
  role: AdminRole;
  created_at: string | null;
};

type EditDraft = {
  email: string;
  role: AdminRole;
  password: string;
};

export default function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("admin");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<EditDraft | null>(null);

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
    setNotice("");
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
      setNotice("Gebruiker toegevoegd");
      await load();
    } catch {
      setError("Geen verbinding met de server");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!edit) return;
    if (edit.password && edit.password.length < 8) {
      setError("Nieuw wachtwoord moet minimaal 8 tekens zijn (of leeg laten)");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body: { email: string; role: AdminRole; password?: string } = {
        email: edit.email,
        role: edit.role,
      };
      if (edit.password.trim()) {
        body.password = edit.password;
      }
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Wijzigen mislukt");
        return;
      }
      setEdit(null);
      setNotice(
        body.password
          ? "Gebruiker bijgewerkt (rol en wachtwoord)"
          : "Gebruiker bijgewerkt (rol)",
      );
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
    setNotice("");
    try {
      const res = await fetch(`/api/admin/users?email=${encodeURIComponent(userEmail)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verwijderen mislukt");
        return;
      }
      if (edit?.email === userEmail) {
        setEdit(null);
      }
      setNotice("Gebruiker verwijderd");
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
      {notice ? (
        <div className="admin-banner ok admin-m-0" role="status">
          {notice}
        </div>
      ) : null}

      {edit ? (
        <div className="admin-panel admin-stack-tight">
          <h2 className="admin-panel-title admin-m-0">Gebruiker aanpassen</h2>
          <p className="admin-muted admin-m-0" style={{ fontSize: "0.875rem" }}>
            Pas de rol aan en/of stel een nieuw wachtwoord in voor{" "}
            <span className="admin-td-mono">{edit.email}</span>.
          </p>
          <div className="admin-form-grid">
            <label className="admin-label">
              E-mailadres
              <input className="admin-field" type="email" value={edit.email} disabled readOnly />
            </label>
            <label className="admin-label">
              Nieuw wachtwoord
              <input
                className="admin-field"
                type="password"
                value={edit.password}
                onChange={(e) => setEdit({ ...edit, password: e.target.value })}
                placeholder="Leeg laten = ongewijzigd"
                autoComplete="new-password"
              />
            </label>
            <label className="admin-label">
              Rol
              <select
                className="admin-field"
                value={edit.role}
                onChange={(e) => setEdit({ ...edit, role: e.target.value as AdminRole })}
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super admin</option>
              </select>
            </label>
          </div>
          <div className="admin-tools-row">
            <button type="button" className="admin-btn-primary" disabled={busy} onClick={() => void saveEdit()}>
              {busy ? "Opslaan…" : "Wijzigingen opslaan"}
            </button>
            <button
              type="button"
              className="admin-btn-secondary"
              disabled={busy}
              onClick={() => {
                setEdit(null);
                setError("");
              }}
            >
              Annuleren
            </button>
          </div>
        </div>
      ) : (
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
      )}

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
                <tr key={u.email} className={edit?.email === u.email ? "admin-table-row-active" : undefined}>
                  <td className="admin-td-mono">{u.email}</td>
                  <td>{u.role === "super_admin" ? "Super admin" : "Admin"}</td>
                  <td className="admin-muted" style={{ fontSize: "0.8rem" }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("nl-NL") : "—"}
                  </td>
                  <td>
                    <div className="admin-tools-row">
                      <button
                        type="button"
                        className="admin-link-action"
                        disabled={busy}
                        onClick={() => {
                          setError("");
                          setNotice("");
                          setEdit({ email: u.email, role: u.role, password: "" });
                        }}
                      >
                        Aanpassen
                      </button>
                      <button
                        type="button"
                        className="admin-btn-danger admin-btn-danger--sm"
                        disabled={busy}
                        onClick={() => void removeUser(u.email)}
                      >
                        Verwijderen
                      </button>
                    </div>
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
