import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminClientSlug } from '@/lib/admin-auth';

export async function GET() {
  const clientSlug = await getAdminClientSlug();
  if (!clientSlug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db.select().from(settings).where(eq(settings.clientSlug, clientSlug)).limit(1);
  return Response.json(rows[0] ?? null);
}

export async function PUT(request: NextRequest) {
  const clientSlug = await getAdminClientSlug();
  if (!clientSlug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, clientSlug: _slug, ...updateData } = body;

  // Convert empty strings to null for numeric fields
  if (updateData.minimumOrderAmount === '') updateData.minimumOrderAmount = null;

  await db.update(settings).set(updateData).where(eq(settings.clientSlug, clientSlug));
  return Response.json({ ok: true });
}
