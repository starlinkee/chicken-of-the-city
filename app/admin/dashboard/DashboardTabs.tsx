'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Statystyki', href: '/admin/dashboard' },
  { label: 'Zamówienia', href: '/admin/dashboard/zamowienia' },
  { label: 'Produkty', href: '/admin/dashboard/produkty' },
  { label: 'Kategorie', href: '/admin/dashboard/kategorie' },
  { label: 'Ustawienia', href: '/admin/dashboard/ustawienia' },
];

export default function DashboardTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-zinc-200 bg-white px-6">
      {TABS.map(tab => {
        const isActive =
          tab.href === '/admin/dashboard'
            ? pathname === '/admin/dashboard'
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              isActive
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
