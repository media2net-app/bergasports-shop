"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/settings": "Instellingen",
  "/admin/products": "Producten",
  "/admin/products/new": "Nieuw product",
  "/admin/orders": "Bestellingen",
  "/admin/pages": "Pagina's",
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
      <h1 className="admin-topbar-heading">{title}</h1>
    </header>
  );
}
