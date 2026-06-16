export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { orders, orderItems } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

function fmt(amount: number) {
  return amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hdrs = await headers();
  const clientSlug = hdrs.get('x-client-slug') ?? process.env.DEFAULT_CLIENT_SLUG ?? 'default';

  const orderRows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.clientSlug, clientSlug)))
    .limit(1);

  if (!orderRows[0]) notFound();

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));

  const order = orderRows[0];
  const itemsTotal = items.reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Wróć do panelu
          </Link>
          <span className="text-zinc-300">/</span>
          <h1 className="font-black text-zinc-900">Zamówienie #{order.orderNumber}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 px-6 py-4">
                <h2 className="font-bold text-zinc-900">Zamówione produkty</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="px-6 py-3">Produkt</th>
                    <th className="px-6 py-3 text-center">Ilość</th>
                    <th className="px-6 py-3 text-right">Cena jedn.</th>
                    <th className="px-6 py-3 text-right">Suma</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.id} className={`border-b border-zinc-100 ${i % 2 === 0 ? '' : 'bg-zinc-50/50'}`}>
                      <td className="px-6 py-3 font-medium text-zinc-900">{item.productName}</td>
                      <td className="px-6 py-3 text-center text-zinc-600">× {item.quantity}</td>
                      <td className="px-6 py-3 text-right text-zinc-500">{fmt(Number(item.unitPrice))}</td>
                      <td className="px-6 py-3 text-right font-semibold text-zinc-900">
                        {fmt(item.quantity * Number(item.unitPrice))}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-zinc-400">Brak danych o pozycjach</td>
                    </tr>
                  )}
                </tbody>
                {items.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-zinc-200 bg-zinc-50">
                      <td colSpan={3} className="px-6 py-3 text-right font-bold text-zinc-900">Łącznie</td>
                      <td className="px-6 py-3 text-right font-black text-zinc-900">{fmt(itemsTotal)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {order.notes && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4">
                <h3 className="mb-2 text-sm font-bold text-amber-800">Uwagi do zamówienia</h3>
                <p className="whitespace-pre-line text-sm text-amber-700">{order.notes}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-bold text-zinc-900">Klient</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Imię i nazwisko</p>
                  <p className="mt-0.5 text-zinc-900">{order.customerName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Email</p>
                  <a href={`mailto:${order.customerEmail}`} className="mt-0.5 block text-orange-500 hover:underline">
                    {order.customerEmail || '—'}
                  </a>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Adres dostawy</p>
                  <p className="mt-0.5 whitespace-pre-line text-zinc-900">{order.shippingAddress || '—'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-bold text-zinc-900">Zamówienie</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Numer</p>
                  <p className="mt-0.5 font-mono font-semibold text-zinc-900">#{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Data</p>
                  <p className="mt-0.5 text-zinc-900">
                    {order.createdAt.toLocaleString('pl-PL', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Kwota</p>
                  <p className="mt-0.5 text-xl font-black text-zinc-900">{fmt(Number(order.amountTotal))}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Status</p>
                  <span className="mt-0.5 inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                    {order.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
