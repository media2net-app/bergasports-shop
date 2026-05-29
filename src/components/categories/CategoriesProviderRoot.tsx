import { CategoriesProvider } from "@/components/categories/CategoriesProvider";
import { loadRalexCategories } from "@/lib/categories-db";

/** Server-side category tree — correct menu on first paint (homepage sidebar + header). */
export default async function CategoriesProviderRoot({ children }: { children: React.ReactNode }) {
  const data = await loadRalexCategories();

  return (
    <CategoriesProvider
      value={{
        tree: data.tree,
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
