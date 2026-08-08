import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, adminSupabase } from '@/lib/admin-auth';
import { seedFromRegistryApi } from '@/lib/services/nppes';

export const maxDuration = 60;

/**
 * Seed / enrich nppes_providers from the live CMS NPI Registry API.
 * Use this for testing and targeted imports (state/city/ZIP/specialty).
 * Full monthly CMS file import uses scripts/import-nppes.ts.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const state = String(body.state || '').trim().toUpperCase();
    const city = String(body.city || '').trim();
    const zip = String(body.zip || '').trim();
    const specialty = String(body.specialty || '').trim();
    const firstName = String(body.first_name || '').trim();
    const lastName = String(body.last_name || '').trim();
    const organizationName = String(body.organization_name || '').trim();
    const limit = Math.min(2000, Math.max(1, Number(body.limit) || 200));

    if (!state && !city && !zip && !specialty && !lastName && !organizationName && !firstName) {
      return NextResponse.json(
        { error: 'Provide State plus City, ZIP, or Specialty (CMS does not allow state alone)' },
        { status: 400 },
      );
    }
    if (state && !city && !zip && !specialty && !lastName && !organizationName && !firstName) {
      return NextResponse.json(
        { error: 'CMS requires City, ZIP, or Specialty in addition to State. Example: FL + Miami' },
        { status: 400 },
      );
    }

    const { data: job, error: jobErr } = await adminSupabase
      .from('nppes_import_jobs')
      .insert({
        source: 'registry_api',
        status: 'running',
        filter_state: state || null,
        filter_city: city || null,
        filter_zip: zip || null,
        filter_specialty: specialty || null,
        started_by: auth.userId,
      })
      .select('*')
      .single();

    if (jobErr) {
      console.warn('[providers/seed] job insert failed:', jobErr.message);
    }

    const result = await seedFromRegistryApi({
      state: state || undefined,
      city: city || undefined,
      zip: zip || undefined,
      taxonomyDescription: specialty || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      organizationName: organizationName || undefined,
      limit,
    });

    if (job?.id) {
      await adminSupabase
        .from('nppes_import_jobs')
        .update({
          status: 'completed',
          total_fetched: result.fetched,
          total_upserted: result.upserted,
          finished_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    }

    return NextResponse.json({
      success: true,
      ...result,
      job_id: job?.id || null,
      message: `Imported ${result.upserted} providers from CMS NPI Registry`,
    });
  } catch (e: any) {
    console.error('[admin/providers/seed]', e);
    return NextResponse.json({ error: e?.message || 'Seed failed' }, { status: 500 });
  }
}
