import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { getEmailSettings, getRestaurantInfo } from '@/lib/queries';
import { db } from '@/lib/db';
import { orders, orderItems, settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export async function POST(request: NextRequest) {
  const clientSlug = request.headers.get('x-client-slug') ?? process.env.DEFAULT_CLIENT_SLUG ?? 'default';

  // Resolve per-tenant Stripe keys (fall back to env vars for dev)
  const tenantSettings = await db
    .select()
    .from(settings)
    .where(eq(settings.clientSlug, clientSlug))
    .limit(1)
    .then(r => r[0] ?? null);

  const stripeSecretKey = tenantSettings?.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY!;
  const webhookSecret = tenantSettings?.stripeWebhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET!;

  const stripe = new Stripe(stripeSecretKey);
  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Brak podpisu Stripe.', { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] Błąd weryfikacji podpisu:', err);
    return new Response('Nieprawidłowy podpis.', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      const customerEmail = session.customer_details?.email ?? '';
      const customerName = session.customer_details?.name ?? 'Klient';
      const amountTotal = ((session.amount_total ?? 0) / 100).toFixed(2);
      const stripeSessionId = session.id;

      const addr = session.collected_information?.shipping_details?.address;
      const shippingAddress = addr
        ? [addr.line1, addr.line2, `${addr.postal_code ?? ''} ${addr.city ?? ''}`.trim(), addr.country]
            .filter(Boolean)
            .join('\n')
        : 'brak';

      const sessionDate = new Date((session.created ?? Date.now() / 1000) * 1000);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const orderId = `${sessionDate.getFullYear().toString().slice(2)}${pad(sessionDate.getMonth() + 1)}${pad(sessionDate.getDate())}-${pad(sessionDate.getHours())}${pad(sessionDate.getMinutes())}${pad(sessionDate.getSeconds())}`;

      const notes = Object.entries(session.metadata ?? {})
        .filter(([k]) => k.startsWith('uwaga_'))
        .map(([, v]) => `• ${v}`)
        .join('\n');

      let itemsText = '';
      let lineItemsData: Stripe.LineItem[] = [];
      try {
        const result = await stripe.checkout.sessions.listLineItems(stripeSessionId, { limit: 100 });
        lineItemsData = result.data;
        itemsText = lineItemsData.map(li => `• ${li.description} × ${li.quantity}`).join('\n');
      } catch (err) {
        console.error('[webhook] Błąd pobierania line items:', err);
        itemsText = '(brak szczegółów)';
      }

      console.log(
        `[webhook] Nowe zamówienie #${orderId} (Stripe: ${stripeSessionId})\n` +
          `  Klient: ${customerName} <${customerEmail}>\n` +
          `  Kwota: ${amountTotal} PLN`
      );

      // Save order to Neon via Drizzle
      try {
        const inserted = await db
          .insert(orders)
          .values({
            clientSlug,
            orderNumber: orderId,
            stripeSessionId,
            customerName,
            customerEmail,
            amountTotal,
            shippingAddress,
            notes: notes || null,
            status: 'completed',
          })
          .returning({ id: orders.id });

        const orderId_ = inserted[0]?.id;
        if (orderId_ && lineItemsData.length > 0) {
          await db.insert(orderItems).values(
            lineItemsData.map(li => ({
              orderId: orderId_,
              productName: li.description ?? '',
              quantity: li.quantity ?? 1,
              unitPrice: String((li.amount_total ?? 0) / 100 / (li.quantity ?? 1)),
            }))
          );
          console.log(`[webhook] Zamówienie #${orderId} zapisane do Neon (${lineItemsData.length} pozycji)`);
        }
      } catch (err) {
        console.error('[webhook] Błąd zapisu zamówienia do Neon:', err);
      }

      // Send emails
      const resendApiKey = tenantSettings?.resendApiKey ?? process.env.RESEND_API_KEY;
      const resendFrom = tenantSettings?.resendFrom ?? process.env.RESEND_FROM;

      if (!resendApiKey || !resendFrom) {
        console.warn('[webhook] Brak RESEND_API_KEY lub RESEND_FROM — pomijam wysyłkę maili.');
        break;
      }

      const resend = new Resend(resendApiKey);

      let emailSettings, restaurantInfo;
      try {
        [emailSettings, restaurantInfo] = await Promise.all([
          getEmailSettings(clientSlug),
          getRestaurantInfo(clientSlug),
        ]);
      } catch (err) {
        console.error('[webhook] Błąd pobierania ustawień:', err);
        break;
      }

      const vars: Record<string, string> = {
        name: customerName,
        email: customerEmail,
        amount: amountTotal,
        orderId,
        items: itemsText,
        notes: notes || 'brak',
        address: shippingAddress,
      };

      if (restaurantInfo.email) {
        try {
          await resend.emails.send({
            from: resendFrom,
            to: restaurantInfo.email,
            subject: fillTemplate(emailSettings.ownerSubject, vars),
            text: fillTemplate(emailSettings.ownerBody, vars),
          });
        } catch (err) {
          console.error('[webhook] Błąd wysyłki maila do właściciela:', err);
        }
      }

      if (customerEmail) {
        try {
          await resend.emails.send({
            from: resendFrom,
            to: customerEmail,
            subject: fillTemplate(emailSettings.customerSubject, vars),
            text: fillTemplate(emailSettings.customerBody, vars),
          });
        } catch (err) {
          console.error('[webhook] Błąd wysyłki maila do klienta:', err);
        }
      }

      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[webhook] Sesja wygasła: ${session.id}`);
      break;
    }

    default:
      break;
  }

  return new Response('OK', { status: 200 });
}
