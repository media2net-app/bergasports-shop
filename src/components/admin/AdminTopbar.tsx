"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/analytics": "Live analytics",
  "/admin/performance": "Performance",
  "/admin/reports": "Reports",
  "/admin/settings": "Settings",
  "/admin/users": "Users",
  "/admin/easy-sales-orders": "Easy Sales",
  "/admin/ai-images": "Generate",
  "/admin/ai-images/templates": "Templates",
  "/admin/ai-images/library": "Library",
  "/admin/products": "Products",
  "/admin/products/new": "New product",
  "/admin/import": "Import",
  "/admin/categories": "Category SEO",
  "/admin/orders": "Shop orders",
  "/admin/customers": "Customers",
  "/admin/pages": "Pages",
};

function titleForPath(path: string): string {
  if (PAGE_TITLES[path]) {
    return PAGE_TITLES[path];
  }
  if (path.startsWith("/admin/products/")) {
    return "Edit product";
  }
  if (path.startsWith("/admin/orders/")) {
    return "Order detail";
  }
  if (path.startsWith("/admin/customers/")) {
    return "Customer";
  }
  if (path.startsWith("/admin/pages/")) {
    return "Edit page";
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
        <span className="admin-sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
      </button>
      <h1 className="admin-topbar-heading">{title}</h1>
    </header>
  );
}
