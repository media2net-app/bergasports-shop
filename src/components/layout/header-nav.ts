export {
  HEADER_NAV_ITEMS,
  HEADER_NAV_LEFT,
  HEADER_NAV_RIGHT,
  WEBSHOP_MENU_LINKS,
  WEBSHOP_MEGA_MENU,
  type HeaderNavItem,
  type ShopMenuLink,
  type ShopMegaMenuColumn,
} from "@/lib/site-content";

export const headerNavLinkClass =
  "relative inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/80 transition hover:text-white md:text-xs";

export const headerNavLinkActiveClass = "text-[var(--brand-mid)] hover:text-[var(--brand-mid)]";
