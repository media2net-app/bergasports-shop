"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/settings": "Instellingen",
  "/admin/products": "Producten",
  "/admin/products/new": "Nieuw product",
  "/admin/orders": "Bestellingen",
  "/admin/pages": "Pagina's",
  "/admin/inventory": "Voorraad",
  "/admin/news": "Nieuws",
  "/admin/users": "Gebruikers",
  "/admin/coupons": "Kortingscodes",
  "/admin/customers": "Klanten",
  "/admin/categories": "Categorieën",
  "/admin/shipping": "Verzending",
  "/admin/email": "E-mailtemplates",
};

function titleForPath(path: string): string {
  if (PAGE_TITLES[path]) {
    return PAGE_TITLES[path];
  }
  if (path.startsWith("/admin/products/")) {
    return "Product bewerken";
  }
  if (path.startsWith("/admin/orders/")) {
    return "Bestelling";
  }
  if (path.startsWith("/admin/pages/")) {
    return "Pagina bewerken";
  }
  if (path.startsWith("/admin/news/")) {
    return "Nieuwsbericht";
  }
  if (path === "/admin/categories/new") {
    return "Nieuwe categorie";
  }
  if (path.startsWith("/admin/categories/")) {
    return "Categorie bewerken";
  }
  if (path.startsWith("/admin/settings/")) {
    return "Instellingen";
  }
  if (path.startsWith("/admin/media")) {
    return "Media";
  }
  if (path.startsWith("/admin/leads")) {
    return "Contact & afspraken";
  }
  if (path.startsWith("/admin/email")) {
    return "E-mailtemplate";
  }
  return "Admin";
}

type AdminTopbarProps = {
  menuOpen: boolean;
  onMenuToggle: () => void;
};

export default function AdminTopbar({ menuOpen, onMenuToggle }: AdminTopbarProps) {
  const path = usePathname() ?? "/admin";
  const title = titleForPath(path.replace(/\/$/, "") || "/admin");

  return (
    <header className="admin-topbar">
      <button
        type="button"
        className="admin-menu-toggle"
        onClick={onMenuToggle}
        aria-expanded={menuOpen}
        aria-controls="admin-sidebar-nav"
      >
        <span className="admin-menu-toggle-icon" aria-hidden />
        <span className="admin-sr-only">{menuOpen ? "Menu sluiten" : "Menu openen"}</span>
      </button>
      <p className="admin-topbar-kicker">Bergasports</p>
      <h1 className="admin-topbar-heading">{title}</h1>
    </header>
  );
}
