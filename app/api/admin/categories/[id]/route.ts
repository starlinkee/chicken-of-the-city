import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getAdminClientSlug } from '@/lib/admin-auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const clientSlug = await getAdminClientSlug();
  if (!clientSlug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, order } = body;

  const [updated] = await db
    .update(categories)
    .set({ name: name?.trim(), order: order ?? 0 })
    .where(and(eq(categories.id, id), eq(categories.clientSlug, clientSlug)))
    .returning();

  if (!updated) return Response.json({ error: 'Nie znaleziono.' }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const clientSlug = await getAdminClientSlug();
  if (!clientSlug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.clientSlug, clientSlug)));
  return Response.json({ ok: true });
}
