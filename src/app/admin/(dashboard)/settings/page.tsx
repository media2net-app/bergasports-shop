import { requireAdminPage } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

function envConfigured(name: string): boolean {
  const v = process.env[name];
  return Boolean(v && v.trim().length > 0);
}

type SettingRow = { label: string; ok: boolean; hint: string };

export default async function AdminSettingsPage() {
  await requireAdminPage();

  const integrations: SettingRow[] = [
    {
      label: "Prisma Postgres",
      ok: envConfigured("DATABASE_URL"),
      hint: "Primary database (admin users; catalog migration in progress)",
    },
    {
      label: "Easy Sales API",
      ok: envConfigured("EASY_SALES_API_TOKEN") || envConfigured("EASY_SALES_TOKEN"),
      hint: "Order sync and sales statistics",
    },
    {
      label: "TikTok Events API",
      ok: envConfigured("TIKTOK_ACCESS_TOKEN"),
      hint: "Checkout conversion events",
    },
    {
      label: "OpenAI (AI images)",
      ok: envConfigured("OPENAI_API_KEY"),
      hint: "Product image generation",
    },
    {
      label: "Order notifications (email)",
      ok:
        (envConfigured("SMTP_HOST") &&
          envConfigured("SMTP_USER") &&
          (envConfigured("SMTP_PASS") || envConfigured("SMTP_PASSWORD"))) ||
        envConfigured("RESEND_API_KEY"),
      hint: "Hostinger: SMTP_HOST, SMTP_USER, SMTP_PASS (+ ORDER_NOTIFICATION_EMAIL). Or Resend: RESEND_API_KEY.",
    },
  ];

  const publicEnv: SettingRow[] = [
    {
      label: "Shop URL",
      ok: envConfigured("NEXT_PUBLIC_SITE_URL") || true,
      hint: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.bergasports.com",
    },
  ];

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Settings</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Integration status (no secret values). Configure variables in Vercel or <code>.env.local</code>.
          </p>
        </div>
      </div>

      <div className="admin-panel admin-stack-tight">
        <h2 className="admin-panel-title admin-m-0">Integrations</h2>
        <ul className="admin-settings-list admin-m-0 admin-mt-05">
          {integrations.map((row) => (
            <li key={row.label} className="admin-settings-row">
              <span className={`admin-settings-dot${row.ok ? " is-ok" : ""}`} aria-hidden />
              <div>
                <strong>{row.label}</strong>
                <p className="admin-muted admin-m-0">{row.hint}</p>
              </div>
              <span className={`admin-badge-src${row.ok ? " admin-badge-easysales--ok" : " admin-badge-easysales--err"}`}>
                {row.ok ? "Configured" : "Missing"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-panel admin-stack-tight">
        <h2 className="admin-panel-title admin-m-0">Public environment</h2>
        <ul className="admin-settings-list admin-m-0 admin-mt-05">
          {publicEnv.map((row) => (
            <li key={row.label} className="admin-settings-row">
              <span className={`admin-settings-dot${row.ok ? " is-ok" : ""}`} aria-hidden />
              <div>
                <strong>{row.label}</strong>
                <p className="admin-muted admin-m-0">{row.hint}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
