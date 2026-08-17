"use client";

import { useState } from "react";
import Link from "next/link";

export default function AccountAuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: mode,
          email,
          password,
          name: mode === "register" ? name : undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || "Mislukt");
        return;
      }
      setOk(true);
    } catch {
      setError("Netwerkfout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="font-[family-name:var(--font-heading)] text-3xl">
        {mode === "login" ? "Inloggen" : "Account aanmaken"}
      </h1>
      <p className="mt-2 text-sm text-[var(--foreground)]/70">
        Guest checkout blijft mogelijk — een account is optioneel.{" "}
        <Link href="/shop" className="underline">
          Verder winkelen
        </Link>
      </p>
      {ok ? (
        <p className="mt-6 text-sm text-emerald-800">Je bent ingelogd.</p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          {mode === "register" ? (
            <label className="block text-sm">
              Naam
              <input
                className="mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          ) : null}
          <label className="block text-sm">
            E-mail
            <input
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Wachtwoord
            <input
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="flex min-h-11 w-full items-center justify-center bg-[var(--topbar)] text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60"
          >
            {loading ? "Bezig…" : mode === "login" ? "Inloggen" : "Registreren"}
          </button>
        </form>
      )}
      <button
        type="button"
        className="mt-4 text-sm underline"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "Nog geen account? Registreren" : "Heb je al een account? Inloggen"}
      </button>
    </>
  );
}
