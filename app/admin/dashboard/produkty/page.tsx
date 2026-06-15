import { db } from '@/lib/db';
import { products, categories } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { headers } from 'next/headers';
import LogoutButton from '../LogoutButton';
import DashboardTabs from '../DashboardTabs';
import ProductyClient from './ProductyClient';

export const dynamic = 'force-dynamic';

export default async function ProduktPage() {
  const hdrs = await headers();
  const clientSlug = hdrs.get('x-client-slug') ?? process.env.DEFAULT_CLIENT_SLUG ?? 'default';

  const [produktyRows, kategorieRows] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        allergens: products.allergens,
        imageUrl: products.imageUrl,
        categoryId: products.categoryId,
        categoryName: categories.name,
        active: products.active,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.clientSlug, clientSlug))
      .orderBy(asc(products.name)),
    db
      .select()
      .from(categories)
      .where(eq(categories.clientSlug, clientSlug))
      .orderBy(asc(categories.order)),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-zinc-900">Panel właściciela</h1>
            <p className="text-sm text-zinc-400">Zarządzanie menu</p>
          </div>
          <LogoutButton />
        </div>
      </div>
      <DashboardTabs />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <ProductyClient
          initialProducts={produktyRows.map(r => ({
            ...r,
            price: parseFloat(r.price),
          }))}
          initialCategories={kategorieRows}
        />
      </div>
    </div>
  );
}
