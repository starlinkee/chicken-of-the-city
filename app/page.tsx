import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getAllCategories, getAllProducts, getBrandSettings } from '@/lib/queries';
import ProductCard from '@/components/ProductCard';
import InteractiveMenu from '@/components/InteractiveMenu';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const hdrs = await headers();
  const clientSlug = hdrs.get('x-client-slug') ?? process.env.DEFAULT_CLIENT_SLUG ?? 'default';

  const [categories, products, brand] = await Promise.all([
    getAllCategories(clientSlug),
    getAllProducts(clientSlug),
    getBrandSettings(clientSlug),
  ]);

  const featuredProducts = products.slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section
        className="py-24 text-white"
        style={{
          background:
            'linear-gradient(to bottom right, #18181b, #27272a, var(--brand-deep))',
        }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-light">
              {brand.heroLabel}
            </p>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              {brand.heroTitle}
              <br />
              <span className="text-brand-light">{brand.heroHighlight}</span>
            </h1>
            <p className="mt-6 text-lg text-zinc-400">
              {brand.heroSubtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Polecane dania */}
      {featuredProducts.length > 0 && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="mb-8 text-2xl font-bold text-zinc-900">
              Polecane dania
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} fallbackEmoji={brand.categoryEmoji} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pełne menu z filtrami kategorii */}
      <InteractiveMenu
        categories={categories}
        products={products}
        fallbackEmoji={brand.categoryEmoji}
      />
    </>
  );
}
