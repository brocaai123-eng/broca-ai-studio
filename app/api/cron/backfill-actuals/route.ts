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

    // population_score: actual = avg new_listings from market_snapshots for this ZIP
    // after the prediction date (proxy: more new listings = more housing demand = higher population pressure)
    if (metric === 'population_score') {
      const { data } = await supabase
        .from('market_snapshots')
        .select('new_listings')
        .eq('zip', zip)
        .gte('snapshot_date', start)
        .lte('snapshot_date', endDate)
        .not('new_listings', 'is', null);
      if (!data || data.length === 0) return null;
      const avg = data.reduce((s, r) => s + (Number(r.new_listings) || 0), 0) / data.length;
      // Normalize to 0-100 scale: 0 listings → score 0, 50+ listings → score 100
      return Math.max(0, Math.min(100, Math.round(avg * 2)));
    }

    // grid_capacity_pct: actual = energy price per kWh from energy_data (FL state level)
    // Higher price = tighter grid = higher capacity utilization
    // We scale price_cents_kwh to a rough capacity % (10¢ ≈ 65%, 15¢ ≈ 85%)
    if (metric === 'grid_capacity_pct') {
      const { data } = await supabase
        .from('energy_data')
        .select('price_cents_kwh')
        .eq('state', 'FL')
        .gte('collected_at', start + 'T00:00:00Z')
        .lte('collected_at', endDate + 'T23:59:59Z')
        .order('collected_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!data?.price_cents_kwh) return null;
      // Scale: 8¢ → 55%, 10¢ → 65%, 12¢ → 75%, 15¢ → 90%
      const kwh = Number(data.price_cents_kwh);
      return Math.max(40, Math.min(98, Math.round(55 + (kwh - 8) * 5)));
    }

    // neighborhood_score: actual = crime-based safety score for the ZIP
    // Fewer incidents = better neighborhood = higher score
    if (metric === 'neighborhood_score') {
      const { data } = await supabase
        .from('crime_records')
        .select('incident_count')
        .eq('zip', zip)
        .gte('record_date', start)
        .lte('record_date', endDate);
      if (!data || data.length === 0) return null;
      const total = data.reduce((s, r) => s + (Number(r.incident_count) || 0), 0);
      // Normalize: 0 incidents → score 100, 500+ incidents → score 0
      return Math.max(0, Math.min(100, Math.round(100 - total / 5)));
    }

    // seller_avg_score: actual = current avg motivated_seller_score from properties table
    // Direct comparison: did the distress level stay the same, rise, or fall?
    if (metric === 'seller_avg_score') {
      const { data } = await supabase
        .from('properties')
        .select('motivated_seller_score')
        .eq('zip', zip)
        .not('motivated_seller_score', 'is', null);
      if (!data || data.length === 0) return null;
      const avg = data.reduce((s, r) => s + (Number(r.motivated_seller_score) || 0), 0) / data.length;
      return Math.round(avg);
    }

    // volatility_index: actual = recalculate EWMA volatility from latest market_snapshots
    // Same formula as the model itself, just with more/newer data points
    if (metric === 'volatility_index') {
      const { data } = await supabase
        .from('market_snapshots')
        .select('median_price')
        .eq('zip', zip)
        .lte('snapshot_date', endDate)
        .order('snapshot_date', { ascending: true })
        .limit(365);
      const prices = (data ?? [])
        .map((s) => Number(s.median_price))
        .filter((v) => v > 0 && Number.isFinite(v));
      if (prices.length < 5) return null;
      const returns: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        returns.push(((prices[i] - prices[i - 1]) / prices[i - 1]) * 100);
      }
      const lambda = 0.94;
      let ewmaVariance = returns.reduce((a, b) => a + b * b, 0) / returns.length;
      for (const r of returns) {
        ewmaVariance = lambda * ewmaVariance + (1 - lambda) * r ** 2;
      }
      const volatility = Math.sqrt(ewmaVariance);
      return Math.max(0, Math.min(100, Math.round(volatility * 20)));
    }
  } catch (e) {
    console.error(`[backfill-actuals] resolveActual error for ${zip}/${metric}:`, e);
  }

  return null;
}
