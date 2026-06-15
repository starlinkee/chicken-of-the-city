import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getAdminClientSlug } from '@/lib/admin-auth';

export async function GET() {
  const clientSlug = await getAdminClientSlug();
  if (!clientSlug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.clientSlug, clientSlug))
    .orderBy(asc(categories.order));

  return Response.json(rows);
}

export async function POST(request: NextRequest) {
  const clientSlug = await getAdminClientSlug();
  if (!clientSlug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, order } = body;

  if (!name) {
    return Response.json({ error: 'Brak nazwy kategorii.' }, { status: 400 });
  }

  const [inserted] = await db
    .insert(categories)
    .values({ clientSlug, name: name.trim(), order: order ?? 0 })
    .returning();

  return Response.json(inserted, { status: 201 });
}
