import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getAllProducts, getRestaurantInfo } from '@/lib/queries';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface CartItemInput {
  id: string;
  quantity: number;
  note?: string;
}

export async function POST(request: NextRequest) {
  const clientSlug = request.headers.get('x-client-slug') ?? process.env.DEFAULT_CLIENT_SLUG ?? 'default';

  // Per-tenant Stripe key (falls back to env for dev)
  const tenantSettings = await db
    .select()
    .from(settings)
    .where(eq(settings.clientSlug, clientSlug))
    .limit(1)
    .then(r => r[0] ?? null);

  const stripeSecretKey = tenantSettings?.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY!;
  const stripe = new Stripe(stripeSecretKey);

  let items: CartItemInput[];
  try {
    const body = await request.json();
    items = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Koszyk jest pusty.' }, { status: 400 });
    }
  } catch {
    return Response.json({ error: 'Nieprawidłowe dane.' }, { status: 400 });
  }

  for (const item of items) {
    if (
      typeof item.id !== 'string' ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    ) {
      return Response.json({ error: 'Nieprawidłowe dane koszyka.' }, { status: 400 });
    }
    if (item.note !== undefined && (typeof item.note !== 'string' || item.note.length > 300)) {
      return Response.json({ error: 'Nieprawidłowe dane koszyka.' }, { status: 400 });
    }
  }

  let products;
  let restaurantInfo;
  try {
    [products, restaurantInfo] = await Promise.all([
      getAllProducts(clientSlug),
      getRestaurantInfo(clientSlug),
    ]);
  } catch {
    return Response.json({ error: 'Błąd pobierania menu.' }, { status: 502 });
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const lineItems = [];

  for (const item of items) {
    const product = productMap.get(item.id);
    if (!product) {
      return Response.json({ error: `Produkt "${item.id}" nie istnieje.` }, { status: 400 });
    }
    lineItems.push({
      price_data: {
        currency: 'pln',
        unit_amount: Math.round(product.price * 100),
        product_data: {
          name: product.name,
          ...(product.image && { images: [product.image.url] }),
        },
      },
      quantity: item.quantity,
    });
  }

  if (restaurantInfo.minimumOrderAmount != null) {
    const total = lineItems.reduce((sum, li) => sum + (li.price_data.unit_amount * li.quantity) / 100, 0);
    if (total < restaurantInfo.minimumOrderAmount) {
      return Response.json(
        { error: `Minimalna kwota zamówienia to ${restaurantInfo.minimumOrderAmount.toFixed(2)} zł.` },
        { status: 400 }
      );
    }
  }

  const metadata: Record<string, string> = {};
  items.forEach((item, index) => {
    if (item.note && item.note.trim()) {
      const product = productMap.get(item.id);
      const label = product ? product.name : item.id;
      metadata[`uwaga_${index + 1}`] = `${label}: ${item.note.trim()}`;
    }
  });

  const totalGrosze = lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0);
  if (totalGrosze < 4900) {
    return Response.json({ error: 'Minimalna kwota zamówienia to 49,00 zł.' }, { status: 400 });
  }

  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_BASE_URL;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/zamowienie/sukces?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/zamowienie/anulowano`,
      shipping_address_collection: { allowed_countries: ['PL'] },
      invoice_creation: { enabled: true },
      ...(Object.keys(metadata).length > 0 && { metadata }),
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[checkout] Stripe error:', err);
    if (err instanceof Stripe.errors.StripeInvalidRequestError && err.code === 'amount_too_small') {
      return Response.json({ error: 'Kwota zamówienia jest zbyt niska. Minimalna kwota to 49,00 zł.' }, { status: 400 });
    }
    return Response.json({ error: 'Błąd inicjalizacji płatności.' }, { status: 500 });
  }
}
