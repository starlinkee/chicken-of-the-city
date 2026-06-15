export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import LogoutButton from '../LogoutButton';
import DashboardTabs from '../DashboardTabs';
import UstawieniaClient from './UstawieniaClient';

export const dynamic = 'force-dynamic';

export default async function UstawieniaPage() {
  const hdrs = await headers();
  const clientSlug = hdrs.get('x-client-slug') ?? process.env.DEFAULT_CLIENT_SLUG ?? 'default';

  const rows = await db.select().from(settings).where(eq(settings.clientSlug, clientSlug)).limit(1);
  const s = rows[0] ?? null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-zinc-900">Panel właściciela</h1>
            <p className="text-sm text-zinc-400">Ustawienia restauracji</p>
          </div>
          <LogoutButton />
        </div>
      </div>
      <DashboardTabs />
      <div className="mx-auto max-w-4xl px-6 py-8">
        <UstawieniaClient settings={s} />
      </div>
    </div>
  );
}
