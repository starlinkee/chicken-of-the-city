const FALLBACK_SLUG = process.env.DEFAULT_CLIENT_SLUG ?? 'default';

export async function resolveTenantSlug(host: string | null): Promise<string> {
  const agencyApiUrl = process.env.AGENCY_API_URL;
  const agencySecret = process.env.AGENCY_API_SECRET;
  if (!agencyApiUrl || !agencySecret || !host) {
    return FALLBACK_SLUG;
  }

  try {
    const res = await fetch(`${agencyApiUrl}/api/tenant?domain=${encodeURIComponent(host)}`, {
      headers: { 'x-agency-secret': agencySecret },
      cache: 'no-store',
    });
    if (!res.ok) return FALLBACK_SLUG;
    const data = await res.json();
    return typeof data.slug === 'string' ? data.slug : FALLBACK_SLUG;
  } catch (err) {
    console.error('[tenant] Błąd pobierania tenanta z agency-platform:', err);
    return FALLBACK_SLUG;
  }
}
