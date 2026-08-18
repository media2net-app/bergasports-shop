import { CategoriesProvider } from "@/components/categories/CategoriesProvider";
import { loadRalexCategories } from "@/lib/categories-db";
import { localizeCategoryFields } from "@/lib/i18n/hydrate";
import { getRequestLocale } from "@/lib/i18n/locale";
import type { RalexCategoryNode } from "@/lib/ralex-categories";

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
  const [data, locale] = await Promise.all([loadRalexCategories(), getRequestLocale().catch(() => "nl")]);

  return (
    <CategoriesProvider
      value={{
        tree: localizeTree(data.tree, locale),
        meta: {
          source: data.source,
          fetchedAt: data.fetchedAt,
          totalCategories: data.totalCategories,
        },
      }}
    >
      {children}
    </CategoriesProvider>
  );
}
