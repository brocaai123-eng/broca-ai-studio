import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MONITORED_ZIPS = [
  '33470', '33411', '33401', '33413', '33418',
  '33458', '33467', '33328', '33309', '33063',
];

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

      const { error } = await supabase.from('market_snapshots').insert({
        zip,
        snapshot_date: today,
        median_price: stats.price?.median ?? stats.medianPrice ?? 0,
        active_listings: stats.activeListings ?? stats.listings ?? 0,
        avg_days_on_market: stats.averageDaysOnMarket ?? stats.daysOnMarket ?? 0,
        new_listings: stats.newListings ?? 0,
        months_of_supply: stats.monthsOfSupply ?? 0,
      });

      if (error) throw error;

      processed++;
      results.push({ zip, status: 'ok' });
    } catch (err) {
      errors++;
      results.push({
        zip,
        status: `error: ${err instanceof Error ? err.message : 'unknown'}`,
      });
      console.error(`[collect-market-data] Failed for zip ${zip}:`, err);
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
