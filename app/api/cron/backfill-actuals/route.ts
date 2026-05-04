import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Nightly cron: backfill actual values into prediction_feedback.
 * For each prediction older than 30 days with no actual_value, we look up
 * what really happened in our stored data tables and fill it in.
 *
 * Schedule: 0 4 * * * (4 AM, after all other collection jobs)
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// How many days after a prediction was made before we try to resolve it
const RESOLVE_AFTER_DAYS = 30;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RESOLVE_AFTER_DAYS);
  const cutoffDate = cutoff.toISOString().split('T')[0];

  let updated = 0;
  let skipped = 0;
  const log: string[] = [];

  try {
    // Fetch all unresolved predictions older than RESOLVE_AFTER_DAYS
    const { data: pending, error: fetchErr } = await supabase
      .from('prediction_feedback')
      .select('id, zip, metric, prediction_date, model_version')
      .is('actual_value', null)
      .lte('prediction_date', cutoffDate)
      .order('prediction_date', { ascending: true })
      .limit(200);

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return NextResponse.json({ success: true, updated: 0, skipped: 0, message: 'No pending predictions to resolve' });
    }

    for (const row of pending) {
      const actual = await resolveActual(row.zip, row.metric, row.prediction_date);
      if (actual === null) {
        skipped++;
        continue;
      }
      const { error: updErr } = await supabase
        .from('prediction_feedback')
        .update({ actual_value: actual })
        .eq('id', row.id);

      if (updErr) {
        log.push(`${row.zip}/${row.metric}/${row.prediction_date}: update error — ${updErr.message}`);
      } else {
        updated++;
        log.push(`${row.zip}/${row.metric}/${row.prediction_date}: actual=${actual}`);
      }
    }
  } catch (e) {
    console.error('[backfill-actuals] Fatal error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  console.log(`[backfill-actuals] Done: ${updated} updated, ${skipped} skipped`);
  return NextResponse.json({ success: true, updated, skipped, log });
}

/**
 * Try to find the real value from our existing data tables.
 * Returns null if no stored data is available for that zip/metric/date.
 */
async function resolveActual(
  zip: string,
  metric: string,
  predictionDate: string,
): Promise<number | null> {
  // Look for a snapshot taken within 7 days AFTER the prediction date
  const start = predictionDate;
  const end = new Date(predictionDate);
  end.setDate(end.getDate() + 7);
  const endDate = end.toISOString().split('T')[0];

  try {
    if (metric === 'price') {
      const { data } = await supabase
        .from('market_snapshots')
        .select('median_price')
        .eq('zip', zip)
        .gte('snapshot_date', start)
        .lte('snapshot_date', endDate)
        .order('snapshot_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data?.median_price ?? null;
    }

    if (metric === 'inventory') {
      const { data } = await supabase
        .from('market_snapshots')
        .select('active_listings')
        .eq('zip', zip)
        .gte('snapshot_date', start)
        .lte('snapshot_date', endDate)
        .order('snapshot_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data?.active_listings ?? null;
    }

    if (metric === 'crime_trend') {
      const { data } = await supabase
        .from('crime_records')
        .select('incident_count')
        .eq('zip', zip)
        .gte('record_date', start)
        .lte('record_date', endDate)
        .order('record_date', { ascending: true });
      if (!data || data.length === 0) return null;
      const total = data.reduce((s, r) => s + (r.incident_count ?? 0), 0);
      return total;
    }

    if (metric === 'energy_load') {
      const { data } = await supabase
        .from('energy_data')
        .select('price_cents_kwh')
        .eq('state', 'FL')
        .gte('collected_at', start)
        .lte('collected_at', endDate + 'T23:59:59Z')
        .order('collected_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data?.price_cents_kwh ?? null;
    }

    // aria_score: check if the listing got an updated score
    if (metric === 'aria_score') {
      const { data } = await supabase
        .from('marketplace_listings')
        .select('aria_score')
        .eq('location_zip', zip)
        .not('aria_score', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.aria_score ?? null;
    }
  } catch (e) {
    console.error(`[backfill-actuals] resolveActual error for ${zip}/${metric}:`, e);
  }

  return null;
}
