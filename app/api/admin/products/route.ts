import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { products, categories } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getAdminClientSlug } from '@/lib/admin-auth';

export async function GET() {
  const clientSlug = await getAdminClientSlug();
  if (!clientSlug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      price: products.price,
      allergens: products.allergens,
      imageUrl: products.imageUrl,
      categoryId: products.categoryId,
      categoryName: categories.name,
      active: products.active,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.clientSlug, clientSlug))
    .orderBy(asc(products.name));

  return Response.json(rows);
}

export async function POST(request: NextRequest) {
  const clientSlug = await getAdminClientSlug();
  if (!clientSlug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, description, price, allergens, imageUrl, categoryId, active } = body;

  if (!name || price === undefined || price === '') {
    return Response.json({ error: 'Brak wymaganych pól: nazwa i cena.' }, { status: 400 });
  }

  const [inserted] = await db
    .insert(products)
    .values({
      clientSlug,
      name: name.trim(),
      description: description?.trim() || null,
      price: String(parseFloat(price)),
      allergens: allergens?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      categoryId: categoryId || null,
      active: active ?? true,
    })
    .returning();

  return Response.json(inserted, { status: 201 });
}
