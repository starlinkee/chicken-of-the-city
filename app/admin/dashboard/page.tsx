export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { orders, orderItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import Charts from './Charts';
import LogoutButton from './LogoutButton';
import CustomerSection from './CustomerSection';
import DashboardTabs from './DashboardTabs';

function getWarsawHour(dateStr: string): number {
  const h = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw', hour: 'numeric', hour12: false }).format(new Date(dateStr))
  );
  return h === 24 ? 0 : h;
}

function getWarsawWeekday(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw', weekday: 'short' }).format(new Date(dateStr));
}

async function getStats(clientSlug: string) {
  const [ordersData, itemsData] = await Promise.all([
    db.select({
      amountTotal: orders.amountTotal,
      createdAt: orders.createdAt,
      customerEmail: orders.customerEmail,
      customerName: orders.customerName,
    }).from(orders).where(eq(orders.clientSlug, clientSlug)),
    db.select({
      orderId: orderItems.orderId,
      productName: orderItems.productName,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
    }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(eq(orders.clientSlug, clientSlug)),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const totalOrders = ordersData.length;
  const totalRevenue = ordersData.reduce((s, o) => s + Number(o.amountTotal), 0);
  const todayOrders = ordersData.filter(o => o.createdAt.toISOString().slice(0, 10) === today).length;
  const todayRevenue = ordersData
    .filter(o => o.createdAt.toISOString().slice(0, 10) === today)
    .reduce((s, o) => s + Number(o.amountTotal), 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const prevDate = new Date();
  prevDate.setDate(1);
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonth = prevDate.toISOString().slice(0, 7);

  const thisMonthOrders = ordersData.filter(o => o.createdAt.toISOString().startsWith(thisMonth));
  const prevMonthOrders = ordersData.filter(o => o.createdAt.toISOString().startsWith(prevMonth));
  const thisMonthRevenue = thisMonthOrders.reduce((s, o) => s + Number(o.amountTotal), 0);
  const prevMonthRevenue = prevMonthOrders.reduce((s, o) => s + Number(o.amountTotal), 0);
  const thisMonthAov = thisMonthOrders.length > 0 ? thisMonthRevenue / thisMonthOrders.length : 0;
  const prevMonthAov = prevMonthOrders.length > 0 ? prevMonthRevenue / prevMonthOrders.length : 0;

  function momPct(curr: number, prev: number): number | null {
    return prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null;
  }

  const momRevenue = momPct(thisMonthRevenue, prevMonthRevenue);
  const momOrders = momPct(thisMonthOrders.length, prevMonthOrders.length);
  const momAov = momPct(thisMonthAov, prevMonthAov);

  const last30 = new Date();
  last30.setDate(last30.getDate() - 29);
  const dailyMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(last30);
    d.setDate(d.getDate() + i);
    dailyMap[d.toISOString().slice(0, 10)] = 0;
  }
  ordersData
    .filter(o => o.createdAt.toISOString().slice(0, 10) >= last30.toISOString().slice(0, 10))
    .forEach(o => {
      const day = o.createdAt.toISOString().slice(0, 10);
      if (day in dailyMap) dailyMap[day] += Number(o.amountTotal);
    });
  const dailyData = Object.entries(dailyMap).map(([date, revenue]) => ({
    date: date.slice(5),
    przychód: Math.round(revenue * 100) / 100,
  }));

  const MONTHS_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
  const monthlyMap: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    monthlyMap[d.toISOString().slice(0, 7)] = 0;
  }
  ordersData.forEach(o => {
    const key = o.createdAt.toISOString().slice(0, 7);
    if (key in monthlyMap) monthlyMap[key] += Number(o.amountTotal);
  });
  const monthlyData = Object.entries(monthlyMap).map(([key, revenue]) => ({
    date: MONTHS_PL[parseInt(key.split('-')[1]) - 1],
    przychód: Math.round(revenue * 100) / 100,
  }));

  const productMap: Record<string, { quantity: number; revenue: number }> = {};
  itemsData.forEach(item => {
    if (!productMap[item.productName]) productMap[item.productName] = { quantity: 0, revenue: 0 };
    productMap[item.productName].quantity += item.quantity;
    productMap[item.productName].revenue += item.quantity * Number(item.unitPrice);
  });
  const topProducts = Object.entries(productMap)
    .map(([name, v]) => ({ name, quantity: v.quantity, revenue: Math.round(v.revenue * 100) / 100 }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const hoursMap: Record<number, number> = {};
  for (let i = 0; i < 24; i++) hoursMap[i] = 0;
  ordersData.forEach(o => {
    const h = getWarsawHour(o.createdAt.toISOString());
    hoursMap[h] = (hoursMap[h] ?? 0) + 1;
  });
  const peakHours = Array.from({ length: 24 }, (_, i) => ({ label: `${i}:00`, count: hoursMap[i] }));

  const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'];
  const DAY_MAP: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const daysMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  ordersData.forEach(o => {
    const d = DAY_MAP[getWarsawWeekday(o.createdAt.toISOString())];
    if (d !== undefined) daysMap[d] += 1;
  });
  const peakDays = DAY_LABELS.map((label, i) => ({ label, count: daysMap[i] }));

  const customerMap: Record<string, { orders: number; revenue: number; name: string; dates: string[] }> = {};
  ordersData.forEach(o => {
    const email = o.customerEmail ?? '';
    if (!email) return;
    if (!customerMap[email]) customerMap[email] = { orders: 0, revenue: 0, name: o.customerName ?? '', dates: [] };
    customerMap[email].orders += 1;
    customerMap[email].revenue += Number(o.amountTotal);
    customerMap[email].dates.push(o.createdAt.toISOString());
  });

  const allCustomers = Object.entries(customerMap);
  const newCustomers = allCustomers.filter(([, v]) => v.orders === 1).length;
  const returningCustomers = allCustomers.filter(([, v]) => v.orders >= 2).length;
  const retentionRate = allCustomers.length > 0 ? Math.round((returningCustomers / allCustomers.length) * 100) : 0;

  let totalGaps = 0;
  let gapCount = 0;
  allCustomers.forEach(([, v]) => {
    const sorted = [...v.dates].sort();
    for (let i = 1; i < sorted.length; i++) {
      totalGaps += (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000;
      gapCount++;
    }
  });
  const avgDaysBetweenOrders = gapCount > 0 ? Math.round(totalGaps / gapCount) : null;

  const topCustomers = allCustomers
    .map(([email, v]) => ({
      email,
      name: v.name,
      orders: v.orders,
      revenue: Math.round(v.revenue * 100) / 100,
      lastOrder: [...v.dates].sort().at(-1) ?? '',
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const orderGroupMap: Record<string, Set<string>> = {};
  itemsData.forEach(item => {
    if (!orderGroupMap[item.orderId]) orderGroupMap[item.orderId] = new Set();
    orderGroupMap[item.orderId].add(item.productName);
  });
  const pairMap: Record<string, number> = {};
  Object.values(orderGroupMap).forEach(productSet => {
    const prods = [...productSet];
    for (let i = 0; i < prods.length; i++) {
      for (let j = i + 1; j < prods.length; j++) {
        const pair = [prods[i], prods[j]].sort().join(' + ');
        pairMap[pair] = (pairMap[pair] ?? 0) + 1;
      }
    }
  });
  const popularBundles = Object.entries(pairMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([pair, count]) => ({ pair, count }));

  return {
    kpi: { totalOrders, totalRevenue, todayOrders, todayRevenue, aov, momRevenue, momOrders, momAov },
    dailyData, monthlyData, topProducts,
    peakHours, peakDays,
    customerStats: { newCustomers, returningCustomers, retentionRate, avgDaysBetweenOrders },
    topCustomers,
    popularBundles,
  };
}

function fmt(amount: number) {
  return amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
}

function KpiCard({ label, value, trend }: { label: string; value: string; trend?: number | null }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-zinc-900">{value}</p>
      {trend != null && (
        <p className={`mt-2 text-xs font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs poprzedni miesiąc
        </p>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const hdrs = await headers();
  const clientSlug = hdrs.get('x-client-slug') ?? process.env.DEFAULT_CLIENT_SLUG ?? 'default';
  const stats = await getStats(clientSlug);
  const { kpi, dailyData, monthlyData, topProducts, peakHours, peakDays, customerStats, topCustomers, popularBundles } = stats;

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
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard label="Łączne zamówienia" value={kpi.totalOrders.toString()} trend={kpi.momOrders} />
          <KpiCard label="Łączny przychód" value={fmt(kpi.totalRevenue)} trend={kpi.momRevenue} />
          <KpiCard label="Zamówienia dzisiaj" value={kpi.todayOrders.toString()} />
          <KpiCard label="Przychód dzisiaj" value={fmt(kpi.todayRevenue)} />
          <KpiCard label="Śr. wartość zamówienia" value={fmt(kpi.aov)} trend={kpi.momAov} />
        </div>

        <Charts
          dailyData={dailyData}
          monthlyData={monthlyData}
          topProducts={topProducts}
          peakHours={peakHours}
          peakDays={peakDays}
        />

        <CustomerSection customerStats={customerStats} topCustomers={topCustomers} />

        {popularBundles.length > 0 && (
          <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-zinc-900">Popularne zestawy</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {popularBundles.map(({ pair, count }) => (
                <div key={pair} className="rounded-xl bg-zinc-50 px-4 py-3">
                  <p className="text-xs font-medium text-zinc-600">{pair}</p>
                  <p className="mt-1 text-lg font-black text-zinc-900">{count}×</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
