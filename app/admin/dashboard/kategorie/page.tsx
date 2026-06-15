export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { headers } from 'next/headers';
import LogoutButton from '../LogoutButton';
import DashboardTabs from '../DashboardTabs';
import KategorieClient from './KategorieClient';

export const dynamic = 'force-dynamic';

export default async function KategoriePage() {
  const hdrs = await headers();
  const clientSlug = hdrs.get('x-client-slug') ?? process.env.DEFAULT_CLIENT_SLUG ?? 'default';

  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.clientSlug, clientSlug))
    .orderBy(asc(categories.order));

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-zinc-900">Panel właściciela</h1>
            <p className="text-sm text-zinc-400">Zarządzanie kategoriami</p>
          </div>
          <LogoutButton />
        </div>
      </div>
      <DashboardTabs />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <KategorieClient initialCategories={rows} />
      </div>
    </div>
  );
}
