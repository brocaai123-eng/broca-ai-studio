import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, adminSupabase } from '@/lib/admin-auth';
import {
  CSV_EXPORT_COLUMNS,
  providerToCsvRow,
  type NppesProvider,
} from '@/lib/services/nppes';
import { rowsToCsv } from '@/lib/utils/csv';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'filtered';
    const maxRows = Math.min(scope === 'all' ? 50_000 : 10_000, Number(searchParams.get('limit') || 10_000));

    let query = adminSupabase
      .from('nppes_providers')
      .select('*')
      .eq('status', searchParams.get('status') === 'deactivated' ? 'deactivated' : 'active')
      .order('search_name', { ascending: true })
      .limit(maxRows);

    if (scope !== 'all') {
      const q = searchParams.get('q');
      const npi = searchParams.get('npi');
      const specialty = searchParams.get('specialty');
      const state = searchParams.get('state');
      const city = searchParams.get('city');
      const zip = searchParams.get('zip');
      const entityType = searchParams.get('entity_type');

      if (npi) query = query.eq('npi', npi.trim());
      if (state) query = query.eq('practice_state', state.trim().toUpperCase());
      if (city) query = query.ilike('practice_city', city.trim());
      if (zip) query = query.eq('practice_zip', zip.replace(/\D/g, '').slice(0, 5));
      if (specialty) query = query.ilike('specialty', `%${specialty.trim()}%`);
      if (entityType === '1' || entityType === '2') query = query.eq('entity_type', entityType);
      if (q?.trim()) {
        const term = q.trim();
        if (/^\d{10}$/.test(term)) {
          query = query.eq('npi', term);
        } else {
          query = query.or(
            `search_name.ilike.%${term}%,provider_last_name.ilike.%${term}%,provider_org_name.ilike.%${term}%`,
          );
        }
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = ((data || []) as NppesProvider[]).map(providerToCsvRow);
    const columns = ['display_name', ...CSV_EXPORT_COLUMNS];
    const csv = rowsToCsv(rows, columns as unknown as string[]);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `broca-nppes-${scope}-${stamp}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error('[admin/providers/export]', e);
    return NextResponse.json({ error: e?.message || 'Export failed' }, { status: 500 });
  }
}
