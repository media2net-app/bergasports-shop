"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import BrandWordmark from "@/components/layout/BrandWordmark";
import { SITE_BRAND_NAME } from "@/lib/site-brand";

/** Alleen voor lokale demo — productie-login blijft leeg. */
const DEMO_ADMIN_EMAIL = "demo@bergasports.com";
const DEMO_ADMIN_PASSWORD = "BgS7!kR9#mQx2$vL4nWp8";

const defaultEmail =
  process.env.NODE_ENV === "development" ? DEMO_ADMIN_EMAIL : "";
const defaultPassword =
  process.env.NODE_ENV === "development" ? DEMO_ADMIN_PASSWORD : "";

export default function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const errParam = params.get("err");
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Inloggen mislukt");
        setLoading(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Geen verbinding met de server");
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-center">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <BrandWordmark className="admin-login-logo" />
        </div>
        <header className="admin-login-header">
          <p className="admin-login-kicker">{SITE_BRAND_NAME}</p>
          <h1 className="admin-login-title">Inloggen</h1>
          <p className="admin-login-subtitle">Admin</p>
        </header>
        {errParam === "config" ? (
          <p className="admin-banner warn admin-m-0 admin-mt-1">
            Zet <code>ADMIN_JWT_SECRET</code> en <code>DATABASE_URL</code> in <code>.env.local</code>.
          </p>
        ) : null}
        <form className="admin-stack-tight admin-login-form" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="admin-label">
              E-mailadres
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className="admin-field admin-field--flush"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "admin-login-error" : undefined}
              required
            />
          </div>
          <div>
            <label htmlFor="pw" className="admin-label">
              Wachtwoord
            </label>
            <input
              id="pw"
              type="password"
              autoComplete="current-password"
              className="admin-field admin-field--flush"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "admin-login-error" : undefined}
              required
            />
          </div>
          {error ? (
            <p id="admin-login-error" role="alert" className="admin-error-box admin-m-0">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={loading} className="admin-btn-primary admin-btn-full">
            {loading ? "Bezig met inloggen…" : "Inloggen"}
          </button>
        </form>
      </div>
    </div>
  );
}
