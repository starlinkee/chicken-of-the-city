import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import CartWidget from '@/components/CartWidget';
import { CartProvider } from '@/context/CartContext';
import { getRestaurantInfo, getSeoSettings, getBrandSettings } from '@/lib/queries';
import type { BrandSettings, RestaurantInfo } from '@/lib/queries';

async function getClientSlug(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get('x-client-slug') ?? process.env.DEFAULT_CLIENT_SLUG ?? 'default';
}

const geist = Geist({ subsets: ['latin'] });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const BRAND_FALLBACK: BrandSettings = {
  restaurantName: 'Chicken',
  restaurantTagline: 'of the City',
  heroLabel: 'Zamów online',
  heroTitle: 'Najlepszy kurczak',
  heroHighlight: 'w mieście.',
  heroSubtitle: 'Świeże składniki, wyjątkowe smaki. Zamów teraz i odbierz gotowe danie.',
  categoryEmoji: '🍗',
  brandColor: '#f97316',
  secondaryColor: '#1d4ed8',
};

const INFO_FALLBACK: RestaurantInfo = {
  phone: '',
  address: '',
  email: '',
  openingHours: '',
  minimumOrderAmount: null,
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const clientSlug = await getClientSlug();
    const seo = await getSeoSettings(clientSlug);
    return {
      metadataBase: new URL(BASE_URL),
      title: {
        default: seo.metaTitle,
        template: `%s | ${seo.metaTitle}`,
      },
      description: seo.metaDescription,
      icons: seo.favicon ? { icon: seo.favicon.url } : undefined,
      openGraph: {
        type: 'website',
        siteName: seo.metaTitle,
        title: seo.metaTitle,
        description: seo.metaDescription,
        url: BASE_URL,
      },
      alternates: {
        canonical: BASE_URL,
      },
    };
  } catch {
    return {
      metadataBase: new URL(BASE_URL),
      title: {
        default: 'Chicken of the City',
        template: '%s | Chicken of the City',
      },
      description: 'Najlepszy kurczak w mieście',
      openGraph: {
        type: 'website',
        siteName: 'Chicken of the City',
        title: 'Chicken of the City',
        description: 'Najlepszy kurczak w mieście',
        url: BASE_URL,
      },
    };
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clientSlug = await getClientSlug();
  const [info, brand] = await Promise.all([
    getRestaurantInfo(clientSlug).catch(() => INFO_FALLBACK),
    getBrandSettings(clientSlug).catch(() => BRAND_FALLBACK),
  ]);

  return (
    <html
      lang="pl"
      className={geist.className}
      style={{
        '--brand': brand.brandColor,
        '--secondary': brand.secondaryColor || '#1d4ed8',
      } as React.CSSProperties}
    >
      <body className="flex min-h-screen flex-col bg-zinc-50">
        <CartProvider>
          <Header
            restaurantName={brand.restaurantName}
            restaurantTagline={brand.restaurantTagline}
          />
          <main className="flex-1">{children}</main>
          <Footer
            info={info}
            restaurantName={brand.restaurantName}
            restaurantTagline={brand.restaurantTagline}
          />
          <CartDrawer minimumOrderAmount={info.minimumOrderAmount} />
          <CartWidget />
        </CartProvider>
      </body>
    </html>
  );
}
