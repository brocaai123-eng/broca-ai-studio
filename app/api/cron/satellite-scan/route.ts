import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzePropertyCondition } from '@/lib/services/sentinel2';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let processed = 0;
  let errors = 0;
  const results: { listing_id: string; status: string }[] = [];

  try {
    const { data: listings, error: fetchError } = await supabase
      .from('marketplace_listings')
      .select('id, latitude, longitude, address')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (fetchError) throw fetchError;

    for (const listing of listings ?? []) {
      try {
        const condition = await analyzePropertyCondition(
          listing.latitude,
          listing.longitude,
        );

        const hasIssues =
          condition.overgrown_vegetation ||
          condition.roof_damage ||
          condition.pool_neglect ||
          condition.vacant_lot ||
          condition.overall_condition === 'poor';

        if (hasIssues) {
          const flags: string[] = [];
          if (condition.overgrown_vegetation) flags.push('overgrown_vegetation');
          if (condition.roof_damage) flags.push('roof_damage');
          if (condition.pool_neglect) flags.push('pool_neglect');
          if (condition.vacant_lot) flags.push('vacant_lot');

          const { error: insertError } = await supabase
            .from('deal_sourcing_signals')
            .insert({
              listing_id: listing.id,
              signal_type: 'satellite_condition',
              signal_data: {
                flags,
                overall_condition: condition.overall_condition,
                confidence: condition.confidence,
                address: listing.address,
              },
              detected_at: new Date().toISOString(),
            });

          if (insertError) throw insertError;
          results.push({ listing_id: listing.id, status: `flagged: ${flags.join(', ')}` });
        } else {
          results.push({ listing_id: listing.id, status: 'ok — no issues' });
        }

        processed++;
      } catch (err) {
        errors++;
        results.push({
          listing_id: listing.id,
          status: `error: ${err instanceof Error ? err.message : 'unknown'}`,
        });
        console.error(`[satellite-scan] Failed for listing ${listing.id}:`, err);
      }
    }
  } catch (err) {
    errors++;
    console.error('[satellite-scan] Failed to fetch listings:', err);
  }

  console.log(`[satellite-scan] Done: ${processed} processed, ${errors} errors`);

  return NextResponse.json({
    success: true,
    processed,
    errors,
    timestamp: new Date().toISOString(),
    details: results,
  });
}
