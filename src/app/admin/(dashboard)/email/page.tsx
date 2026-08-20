import Link from "next/link";

import AdminClickableTableRow from "@/components/admin/AdminClickableTableRow";
import { DEFAULT_EMAIL_TEMPLATES, EMAIL_TEMPLATE_CATEGORY_LABEL, type EmailTemplateCategory } from "@/lib/email-template-defs";
import { listEmailTemplates, type EmailTemplateRow } from "@/lib/email-templates-db";

export const dynamic = "force-dynamic";

const ORDER: EmailTemplateCategory[] = ["order", "admin", "marketing"];

function groupTemplates(templates: EmailTemplateRow[]) {
  return ORDER.map((category) => ({
    category,
    label: EMAIL_TEMPLATE_CATEGORY_LABEL[category],
    items: templates.filter((row) => row.category === category),
  })).filter((group) => group.items.length);
}

export default async function AdminEmailTemplatesPage() {
  const templates = await listEmailTemplates();
  const groups = groupTemplates(templates);

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">E-mailtemplates</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Teksten van ordermails, interne meldingen en marketing. Bewerk ze met de editor; logo en footer blijven
            vast.
          </p>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.category} className="admin-panel admin-table-wrap">
          <h2 className="admin-section-title" style={{ padding: "1rem 1rem 0" }}>
            {group.label}
          </h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Onderwerp</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {group.items.map((row) => {
                const def = DEFAULT_EMAIL_TEMPLATES[row.key];
                const custom =
                  row.subject !== def.subject || row.title !== def.title || row.bodyHtml !== def.bodyHtml;
                return (
                  <AdminClickableTableRow
                    key={row.key}
                    href={`/admin/email/${encodeURIComponent(row.key)}`}
                    title="Klik om te bewerken"
                  >
                    <td>
                      <div>{row.name}</div>
                      <div className="admin-muted" style={{ fontSize: "0.8rem" }}>
                        {row.description}
                      </div>
                    </td>
                    <td className="admin-muted">{row.subject}</td>
                    <td>
                      <span className="admin-badge-src">{custom ? "Aangepast" : "Standaard"}</span>
                    </td>
                    <td className="admin-td-right">
                      <Link href={`/admin/email/${encodeURIComponent(row.key)}`} className="admin-link-action">
                        Bewerken
                      </Link>
                    </td>
                  </AdminClickableTableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
