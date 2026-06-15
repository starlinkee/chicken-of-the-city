import type { Metadata } from 'next';
import { getAllCategories, getAllProducts, getBrandSettings } from '@/lib/queries';

const DEFAULT_CLIENT_SLUG = process.env.DEFAULT_CLIENT_SLUG ?? 'default';
import ProductCard from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Menu',
  description: 'Przeglądaj nasze menu — burgery, skrzydełka, sałatki i więcej. Zamów online i odbierz gotowe danie.',
  alternates: {
    canonical: '/menu',
  },
  openGraph: {
    title: 'Menu',
    description: 'Przeglądaj nasze menu — burgery, skrzydełka, sałatki i więcej.',
    url: '/menu',
  },
};

export default async function MenuPage() {
  const [categories, products, brand] = await Promise.all([
    getAllCategories(DEFAULT_CLIENT_SLUG),
    getAllProducts(DEFAULT_CLIENT_SLUG),
    getBrandSettings(DEFAULT_CLIENT_SLUG),
  ]);

  const productsByCategory = categories.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.category.id === cat.id),
  }));

  const uncategorized = products.filter(
    (p) => !categories.some((c) => c.id === p.category.id)
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-4xl font-black tracking-tight text-zinc-900">
        Menu
      </h1>
      <p className="mb-12 text-zinc-500">
        Świeże składniki, przygotowane na zamówienie.
      </p>

      {productsByCategory.map(
        (cat) =>
          cat.products.length > 0 && (
            <section key={cat.id} id={cat.id} className="mb-14 scroll-mt-24">
              <h2 className="mb-6 border-b border-zinc-200 pb-3 text-2xl font-bold text-zinc-900">
                {cat.name}
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {cat.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    fallbackEmoji={brand.categoryEmoji}
                  />
                ))}
              </div>
            </section>
          )
      )}

      {uncategorized.length > 0 && (
        <section className="mb-14">
          <h2 className="mb-6 border-b border-zinc-200 pb-3 text-2xl font-bold text-zinc-900">
            Pozostałe
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {uncategorized.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                fallbackEmoji={brand.categoryEmoji}
              />
            ))}
          </div>
        </section>
      )}

      {products.length === 0 && (
        <p className="py-20 text-center text-zinc-400">
          Menu jest aktualnie niedostępne. Zajrzyj wkrótce!
        </p>
      )}
    </div>
  );
}
