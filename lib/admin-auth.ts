import { cookies } from 'next/headers';
import { verifyToken } from './auth';

export async function getAdminClientSlug(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.clientSlug ?? null;
}
