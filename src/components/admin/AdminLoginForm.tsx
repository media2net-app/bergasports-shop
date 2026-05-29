"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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
        setError(data.error ?? "Login failed");
        setLoading(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-center">
      <div className="admin-login-card">
        <h1 className="admin-login-title">Admin login</h1>
        {errParam === "config" ? (
          <p className="admin-banner warn admin-m-0 admin-mt-1">
            Set <code>ADMIN_JWT_SECRET</code> and <code>DATABASE_URL</code> in <code>.env.local</code>.
          </p>
        ) : null}
        <form className="admin-stack-tight admin-mt-1" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="admin-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="admin-field admin-field--flush"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="pw" className="admin-label">
              Password
            </label>
            <input
              id="pw"
              type="password"
              autoComplete="current-password"
              className="admin-field admin-field--flush"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="admin-error-box admin-m-0">{error}</p> : null}
          <button type="submit" disabled={loading} className="admin-btn-primary admin-btn-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
