import { CategoriesProvider } from "@/components/categories/CategoriesProvider";
import { ShopNavBrandsProvider } from "@/components/layout/ShopNavBrandsProvider";
import { listVisibleBrands } from "@/lib/brands-db";
import { brandSlugFromName, type ShopNavBrand } from "@/lib/brands-shared";
import { loadRalexCategories } from "@/lib/categories-db";
import { localizeCategoryFields } from "@/lib/i18n/hydrate";
import { getRequestLocale } from "@/lib/i18n/locale";
import type { RalexCategoryNode } from "@/lib/ralex-categories";
import { HOME_BRAND_LIST } from "@/lib/site-content";
import { visiblePublicNavTree } from "@/lib/shop-nav-tree";

function localizeTree(nodes: RalexCategoryNode[], locale: string): RalexCategoryNode[] {
  return nodes.map((node) => {
    const fields = localizeCategoryFields(node, locale);
    return {
      ...node,
      name: fields.name || node.name,
      children: localizeTree(node.children ?? [], locale),
    };
  });
}

/** Server-side category tree — correct menu on first paint (homepage sidebar + header). */
export default async function CategoriesProviderRoot({ children }: { children: React.ReactNode }) {
  const [data, locale, managedBrands] = await Promise.all([
    loadRalexCategories(),
    getRequestLocale().catch(() => "nl"),
    listVisibleBrands().catch(() => []),
  ]);
  const brands: ShopNavBrand[] =
    managedBrands.length > 0
      ? managedBrands.map((brand) => ({ name: brand.name, slug: brand.slug }))
      : HOME_BRAND_LIST.map((name) => ({ name, slug: brandSlugFromName(name) }));

  return (
    <CategoriesProvider
      value={{
        tree: visiblePublicNavTree(localizeTree(data.tree, locale)),
        meta: {
          source: data.source,
          fetchedAt: data.fetchedAt,
          totalCategories: data.totalCategories,
        },
      }}
    >
      <ShopNavBrandsProvider brands={brands}>{children}</ShopNavBrandsProvider>
    </CategoriesProvider>
  );
}
