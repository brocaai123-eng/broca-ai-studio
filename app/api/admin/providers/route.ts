import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getLocationsForState, getProviderStats, searchProviders } from '@/lib/services/nppes';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('stats') === '1') {
      const stats = await getProviderStats();
      return NextResponse.json(stats);
    }

    if (searchParams.get('locations') === '1') {
      const state = String(searchParams.get('state') || '').trim();
      if (!state) {
        return NextResponse.json({ error: 'state is required' }, { status: 400 });
      }
      const city = searchParams.get('city') || undefined;
      const locations = await getLocationsForState(state, city);
      return NextResponse.json(locations);
    }

    const result = await searchProviders({
      q: searchParams.get('q') || undefined,
      npi: searchParams.get('npi') || undefined,
      specialty: searchParams.get('specialty') || undefined,
      state: searchParams.get('state') || undefined,
      city: searchParams.get('city') || undefined,
      zip: searchParams.get('zip') || undefined,
      entityType: searchParams.get('entity_type') || undefined,
      status: searchParams.get('status') || undefined,
      page: Number(searchParams.get('page') || 1),
      limit: Number(searchParams.get('limit') || 25),
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('[admin/providers]', e);
    return NextResponse.json({ error: e?.message || 'Failed to load providers' }, { status: 500 });
  }
}
