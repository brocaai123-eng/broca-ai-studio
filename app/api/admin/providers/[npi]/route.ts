import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getProvider } from '@/lib/services/nppes';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ npi: string }> },
) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { npi } = await context.params;
    if (!npi || !/^\d{10}$/.test(npi)) {
      return NextResponse.json({ error: 'Invalid NPI' }, { status: 400 });
    }
    const provider = await getProvider(npi);
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }
    return NextResponse.json({ provider });
  } catch (e: any) {
    console.error('[admin/providers/npi]', e);
    return NextResponse.json({ error: e?.message || 'Failed to load provider' }, { status: 500 });
  }
}
