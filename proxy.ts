import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { resolveTenantSlug } from '@/lib/tenant';

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin/dashboard')) {
    const token = request.cookies.get('admin_session')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-client-slug', payload.clientSlug);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Publiczna strona/API: tenant wynika z hosta (subdomena/custom domain),
  // odpytujemy agency-platform o slug.
  const clientSlug = await resolveTenantSlug(request.headers.get('host'));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-client-slug', clientSlug);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
