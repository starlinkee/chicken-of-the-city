export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq, and, or, ilike, gte, lte, desc } from 'drizzle-orm';
import OrdersTable from '../OrdersTable';
import LogoutButton from '../LogoutButton';
import DashboardTabs from '../DashboardTabs';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

const DEFAULT_CLIENT_SLUG = process.env.DEFAULT_CLIENT_SLUG ?? 'default';
const PAGE_SIZE = 20;

async function getOrders(
  query: string,
  page: number,
  status: string,
  amountMin: string,
  amountMax: string,
  dateFrom: string,
  dateTo: string,
) {
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [eq(orders.clientSlug, DEFAULT_CLIENT_SLUG)];

  if (query) {
    conditions.push(
      or(
        ilike(orders.orderNumber, `%${query}%`),
        ilike(orders.customerName, `%${query}%`),
        ilike(orders.customerEmail, `%${query}%`),
        ilike(orders.shippingAddress, `%${query}%`),
      )!
    );
  }
  if (status) conditions.push(eq(orders.status, status));
  if (amountMin) conditions.push(gte(orders.amountTotal, amountMin));
  if (amountMax) conditions.push(lte(orders.amountTotal, amountMax));
  if (dateFrom) conditions.push(gte(orders.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(orders.createdAt, new Date(`${dateTo}T23:59:59.999Z`)));

  const where = and(...conditions);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        amountTotal: orders.amountTotal,
        createdAt: orders.createdAt,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        shippingAddress: orders.shippingAddress,
        status: orders.status,
      })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.$count(orders, where),
  ]);

  // Normalize to plain objects matching old Supabase shape
  const normalized = rows.map(r => ({
    id: r.id,
    order_number: r.orderNumber,
    amount_total: parseFloat(r.amountTotal),
    created_at: r.createdAt.toISOString(),
    customer_name: r.customerName,
    customer_email: r.customerEmail,
    shipping_address: r.shippingAddress,
    status: r.status,
  }));

  return { orders: normalized, total: countRows };
}

export default async function ZamowieniaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string; amountMin?: string; amountMax?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const { q = '', page: pageStr = '1', status = '', amountMin = '', amountMax = '', dateFrom = '', dateTo = '' } = await searchParams;
  const page = Math.max(1, parseInt(pageStr) || 1);

  const { orders: ordersData, total } = await getOrders(q, page, status, amountMin, amountMax, dateFrom, dateTo);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-zinc-900">Panel właściciela</h1>
            <p className="text-sm text-zinc-400">Statystyki i zamówienia</p>
          </div>
          <LogoutButton />
        </div>
      </div>

      <DashboardTabs />

      <div className="mx-auto max-w-7xl px-6 py-8">
        <Suspense>
          <OrdersTable orders={ordersData} total={total} page={page} query={q} status={status} amountMin={amountMin} amountMax={amountMax} dateFrom={dateFrom} dateTo={dateTo} />
        </Suspense>
      </div>
    </div>
  );
}
