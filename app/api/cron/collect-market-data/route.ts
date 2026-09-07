import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writePrediction } from '@/lib/services/prediction-tracker';
import { MONITORED_ZIPS } from '@/lib/services/monitored-zips';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RENTCAST_BASE = 'https://api.rentcast.io/v1';

async function fetchMarketStats(zip: string) {
  const res = await fetch(
    `${RENTCAST_BASE}/market/statistics?zipCode=${zip}`,
    {
      headers: {
        'X-Api-Key': process.env.RENTCAST_API_KEY!,
        Accept: 'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`RentCast API error ${res.status} for zip ${zip}`);
  }

  return res.json();
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];
  let processed = 0;
  let errors = 0;
  const results: { zip: string; status: string }[] = [];

  for (const zip of MONITORED_ZIPS) {
    try {
      const stats = await fetchMarketStats(zip);

      const { error } = await supabase.from('market_snapshots').upsert({
        zip,
        snapshot_date: today,
        median_price: stats.price?.median ?? stats.medianPrice ?? 0,
        active_listings: stats.activeListings ?? stats.listings ?? 0,
        avg_days_on_market: stats.averageDaysOnMarket ?? stats.daysOnMarket ?? 0,
        new_listings: stats.newListings ?? 0,
        months_of_supply: stats.monthsOfSupply ?? 0,
      }, { onConflict: 'zip,snapshot_date' });

      if (error) throw error;

      // Write price & inventory predictions for accuracy tracking
      const medianPrice = stats.price?.median ?? stats.medianPrice ?? null;
      const activeListings = stats.activeListings ?? stats.listings ?? null;
      if (medianPrice) {
        void writePrediction({ zip, metric: 'price', model_version: 'rentcast-v1', predicted_value: medianPrice });
      }
      if (activeListings) {
        void writePrediction({ zip, metric: 'inventory', model_version: 'rentcast-v1', predicted_value: activeListings });
      }

      processed++;
      results.push({ zip, status: 'ok' });
    } catch (err) {
      // RentCast is often inactive — still train from property records we already have.
      try {
        const { data: props } = await supabase
          .from('properties')
          .select('estimated_value')
          .eq('zip', zip);
        const values = (props ?? [])
          .map((p) => Number(p.estimated_value))
          .filter((v) => v > 0 && Number.isFinite(v))
          .sort((a, b) => a - b);
        if (!values.length) throw err;
        const median = values[Math.floor(values.length / 2)];
        const { error } = await supabase.from('market_snapshots').upsert({
          zip,
          snapshot_date: today,
          median_price: Math.round(median),
          active_listings: values.length,
          new_listings: values.length,
        }, { onConflict: 'zip,snapshot_date' });
        if (error) throw error;
        void writePrediction({ zip, metric: 'price', model_version: 'properties-v1', predicted_value: median });
        processed++;
        results.push({ zip, status: `fallback-properties (${values.length} homes)` });
        continue;
      } catch (inner) {
        errors++;
        results.push({
          zip,
          status: `error: ${inner instanceof Error ? inner.message : 'unknown'}`,
        });
        console.error(`[collect-market-data] Failed for zip ${zip}:`, inner);
      }
    }
  }

  console.log(`[collect-market-data] Done: ${processed} processed, ${errors} errors`);

  return NextResponse.json({
    success: true,
    processed,
    errors,
    timestamp: new Date().toISOString(),
    details: results,
  });
}
