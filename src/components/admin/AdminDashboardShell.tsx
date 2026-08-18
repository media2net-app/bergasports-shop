"use client";

import Link from "next/link";
import BrandWordmark from "@/components/layout/BrandWordmark";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import AdminSidebarDbStatus from "@/components/admin/AdminSidebarDbStatus";
import AdminTopbar from "@/components/admin/AdminTopbar";
import {
  IconDashboard,
  IconExternal,
  IconInventory,
  IconLeads,
  IconLogout,
  IconMail,
  IconMedia,
  IconNews,
  IconOrders,
  IconPages,
  IconProducts,
  IconSettings,
  IconTag,
  IconUsers,
} from "@/components/admin/AdminMetricIcons";

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
      <IconLogout />
      Uitloggen
    </button>
  );
}

type NavLinkProps = {
  href: string;
  active: boolean;
  onNavigate: () => void;
  icon?: ReactNode;
  children: ReactNode;
};

function AdminNavLink({ href, active, onNavigate, icon, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`admin-sidebar-link${active ? " active" : ""}`}
      onClick={onNavigate}
    >
      {icon ? <span className="admin-sidebar-link-icon">{icon}</span> : null}
      {children}
    </Link>
  );
}

type AdminDashboardShellProps = {
  children: ReactNode;
  roleLabel: string;
  superAdmin: boolean;
};

export default function AdminDashboardShell({
  children,
  roleLabel,
  superAdmin,
}: AdminDashboardShellProps) {
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
  const inventoryActive = path.startsWith("/admin/inventory");
  const pagesActive = path.startsWith("/admin/pages");
  const newsActive = path.startsWith("/admin/news");
  const mediaActive = path.startsWith("/admin/media");
  const leadsActive = path.startsWith("/admin/leads");
  const emailActive = path.startsWith("/admin/email");
  const ordersActive = path.startsWith("/admin/orders");
  const couponsActive = path.startsWith("/admin/coupons");
  const customersActive = path.startsWith("/admin/customers");
  const categoriesActive = path.startsWith("/admin/categories");
  const settingsActive = path.startsWith("/admin/settings");
  const usersActive = path.startsWith("/admin/users");

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
          <div className="admin-sidebar-group">
            <div className="admin-sidebar-group-label">Overzicht</div>
            <AdminNavLink href="/admin" active={dashActive} onNavigate={closeMenu} icon={<IconDashboard />}>
              Dashboard
            </AdminNavLink>
          </div>
          <div className="admin-sidebar-group">
            <div className="admin-sidebar-group-label">Shop</div>
            <AdminNavLink
              href="/admin/products"
              active={productsActive}
              onNavigate={closeMenu}
              icon={<IconProducts />}
            >
              Producten
            </AdminNavLink>
            <AdminNavLink
              href="/admin/inventory"
              active={inventoryActive}
              onNavigate={closeMenu}
              icon={<IconInventory />}
            >
              Voorraad
            </AdminNavLink>
            <AdminNavLink href="/admin/orders" active={ordersActive} onNavigate={closeMenu} icon={<IconOrders />}>
              Bestellingen
            </AdminNavLink>
            <AdminNavLink href="/admin/customers" active={customersActive} onNavigate={closeMenu} icon={<IconUsers />}>
              Klanten
            </AdminNavLink>
            <AdminNavLink href="/admin/coupons" active={couponsActive} onNavigate={closeMenu} icon={<IconTag />}>
              Kortingscodes
            </AdminNavLink>
            <AdminNavLink
              href="/admin/shipping"
              active={path.startsWith("/admin/shipping")}
              onNavigate={closeMenu}
              icon={<IconInventory />}
            >
              Verzending
            </AdminNavLink>
          </div>
          <div className="admin-sidebar-group">
            <div className="admin-sidebar-group-label">Content</div>
            <AdminNavLink href="/admin/pages" active={pagesActive} onNavigate={closeMenu} icon={<IconPages />}>
              Pagina&apos;s
            </AdminNavLink>
            <AdminNavLink
              href="/admin/categories"
              active={categoriesActive}
              onNavigate={closeMenu}
              icon={<IconPages />}
            >
              Categorieën
            </AdminNavLink>
            <AdminNavLink href="/admin/news" active={newsActive} onNavigate={closeMenu} icon={<IconNews />}>
              Nieuws
            </AdminNavLink>
            <AdminNavLink href="/admin/media" active={mediaActive} onNavigate={closeMenu} icon={<IconMedia />}>
              Media
            </AdminNavLink>
            <AdminNavLink href="/admin/leads" active={leadsActive} onNavigate={closeMenu} icon={<IconLeads />}>
              Contact &amp; afspraken
            </AdminNavLink>
            <AdminNavLink href="/admin/email" active={emailActive} onNavigate={closeMenu} icon={<IconMail />}>
              E-mails
            </AdminNavLink>
          </div>
          <div className="admin-sidebar-group">
            <div className="admin-sidebar-group-label">Beheer</div>
            <AdminNavLink
              href="/admin/settings"
              active={settingsActive}
              onNavigate={closeMenu}
              icon={<IconSettings />}
            >
              Instellingen
            </AdminNavLink>
            {superAdmin ? (
              <AdminNavLink href="/admin/users" active={usersActive} onNavigate={closeMenu} icon={<IconUsers />}>
                Gebruikers
              </AdminNavLink>
            ) : null}
          </div>
        </nav>
        <div className="admin-sidebar-foot">
          <Link href="/" className="admin-sidebar-shop" onClick={closeMenu}>
            <IconExternal />
            Bekijk shop
          </Link>
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
