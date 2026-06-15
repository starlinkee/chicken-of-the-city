import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getAdminClientSlug } from '@/lib/admin-auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const clientSlug = await getAdminClientSlug();
  if (!clientSlug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, description, price, allergens, imageUrl, categoryId, active } = body;

  const [updated] = await db
    .update(products)
    .set({
      name: name?.trim(),
      description: description?.trim() || null,
      price: String(parseFloat(price)),
      allergens: allergens?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      categoryId: categoryId || null,
      active: active ?? true,
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, id), eq(products.clientSlug, clientSlug)))
    .returning();

  if (!updated) return Response.json({ error: 'Nie znaleziono.' }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const clientSlug = await getAdminClientSlug();
  if (!clientSlug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await db.delete(products).where(and(eq(products.id, id), eq(products.clientSlug, clientSlug)));
  return Response.json({ ok: true });
}
