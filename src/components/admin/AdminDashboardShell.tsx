"use client";

import Link from "next/link";
import BrandWordmark from "@/components/layout/BrandWordmark";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import AdminSidebarDbStatus from "@/components/admin/AdminSidebarDbStatus";
import AdminTopbar from "@/components/admin/AdminTopbar";

function AdminLogoutButton() {
  return (
    <button
      type="button"
      className="admin-btn-logout"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        window.location.href = "/admin/login";
      }}
    >
      Uitloggen
    </button>
  );
}

type NavLinkProps = {
  href: string;
  active: boolean;
  onNavigate: () => void;
  children: ReactNode;
};

function AdminNavLink({ href, active, onNavigate, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`admin-sidebar-link${active ? " active" : ""}`}
      onClick={onNavigate}
    >
      {children}
    </Link>
  );
}

type AdminDashboardShellProps = {
  children: ReactNode;
  roleLabel: string;
  superAdmin: boolean;
};

export default function AdminDashboardShell({ children, roleLabel }: AdminDashboardShellProps) {
  const path = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);

  useEffect(() => {
    closeMenu();
  }, [path, closeMenu]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, closeMenu]);

  const dashActive = path === "/admin" || path === "/admin/";
  const productsActive = path.startsWith("/admin/products");
  const pagesActive = path.startsWith("/admin/pages");
  const newsActive = path.startsWith("/admin/news");
  const ordersActive = path.startsWith("/admin/orders");
  const settingsActive = path.startsWith("/admin/settings");

  return (
    <div className={`admin-shell${menuOpen ? " admin-shell--menu-open" : ""}`}>
      <button
        type="button"
        className="admin-sidebar-backdrop"
        aria-label="Menu sluiten"
        onClick={closeMenu}
      />
      <aside className={`admin-sidebar${menuOpen ? " is-open" : ""}`} aria-label="Admin navigatie">
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-brand-row">
            <div>
              <BrandWordmark compact className="mb-2" />
              <div
                className={`admin-sidebar-sub${roleLabel === "Super admin" ? " admin-sidebar-sub--super" : ""}`}
              >
                {roleLabel}
              </div>
            </div>
            <button
              type="button"
              className="admin-sidebar-close"
              aria-label="Menu sluiten"
              onClick={closeMenu}
            >
              <span aria-hidden>×</span>
            </button>
          </div>
        </div>
        <nav id="admin-sidebar-nav" className="admin-sidebar-nav" aria-label="Secties">
          <AdminNavLink href="/admin" active={dashActive} onNavigate={closeMenu}>
            Dashboard
          </AdminNavLink>
          <AdminNavLink href="/admin/products" active={productsActive} onNavigate={closeMenu}>
            Producten
          </AdminNavLink>
          <AdminNavLink href="/admin/pages" active={pagesActive} onNavigate={closeMenu}>
            Pagina&apos;s
          </AdminNavLink>
          <AdminNavLink href="/admin/news" active={newsActive} onNavigate={closeMenu}>
            Nieuws
          </AdminNavLink>
          <AdminNavLink href="/admin/orders" active={ordersActive} onNavigate={closeMenu}>
            Bestellingen
          </AdminNavLink>
          <AdminNavLink href="/admin/settings" active={settingsActive} onNavigate={closeMenu}>
            Instellingen
          </AdminNavLink>
          <AdminNavLink href="/" active={false} onNavigate={closeMenu}>
            Bekijk shop
          </AdminNavLink>
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-sidebar-integrations" aria-label="Integraties">
            <AdminSidebarDbStatus />
          </div>
          <AdminLogoutButton />
        </div>
      </aside>
      <div className="admin-main-area">
        <AdminTopbar menuOpen={menuOpen} onMenuToggle={toggleMenu} />
        <div className="admin-main-scroll">
          <div className="admin-main-pad">{children}</div>
        </div>
      </div>
    </div>
  );
}
