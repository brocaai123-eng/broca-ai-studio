import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCORE_CHANGE_THRESHOLD = 10;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let processed = 0;
  let errors = 0;
  const alerts: { type: string; detail: string }[] = [];

  try {
    // Check predictions for significant score changes
    const { data: recentPredictions, error: predError } = await supabase
      .from('predictions')
      .select('id, zip, score, previous_score, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (predError) throw predError;

    for (const pred of recentPredictions ?? []) {
      if (
        pred.previous_score != null &&
        Math.abs(pred.score - pred.previous_score) > SCORE_CHANGE_THRESHOLD
      ) {
        const direction = pred.score > pred.previous_score ? 'increased' : 'decreased';

        const { error: insertErr } = await supabase.from('alert_log').insert({
          alert_type: 'score_change',
          zip: pred.zip,
          severity: Math.abs(pred.score - pred.previous_score) > 20 ? 'high' : 'medium',
          message: `Prediction score ${direction} by ${Math.abs(pred.score - pred.previous_score)} points (${pred.previous_score} → ${pred.score})`,
          reference_id: pred.id,
          created_at: new Date().toISOString(),
        });

        if (insertErr) {
          errors++;
          console.error('[check-alerts] Failed to insert score alert:', insertErr);
        } else {
          processed++;
          alerts.push({
            type: 'score_change',
            detail: `${pred.zip}: ${pred.previous_score} → ${pred.score}`,
          });
        }
      }
    }

    // Check for new listings matching user-saved criteria
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const cutoff = yesterday.toISOString();

    const { data: newListings, error: listError } = await supabase
      .from('marketplace_listings')
      .select('id, zip, price, property_type, address')
      .gte('created_at', cutoff);

    if (listError) throw listError;

    if (newListings && newListings.length > 0) {
      const { data: savedSearches, error: searchError } = await supabase
        .from('saved_searches')
        .select('id, user_id, criteria');

      if (searchError) throw searchError;

      for (const search of savedSearches ?? []) {
        const criteria = search.criteria as {
          zip?: string;
          max_price?: number;
          property_type?: string;
        } | null;
        if (!criteria) continue;

        const matches = newListings.filter((listing) => {
          if (criteria.zip && listing.zip !== criteria.zip) return false;
          if (criteria.max_price && listing.price > criteria.max_price) return false;
          if (criteria.property_type && listing.property_type !== criteria.property_type)
            return false;
          return true;
        });

        for (const match of matches) {
          const { error: alertErr } = await supabase.from('alert_log').insert({
            alert_type: 'new_listing_match',
            zip: match.zip,
            severity: 'low',
            message: `New listing at ${match.address ?? 'unknown address'} ($${match.price?.toLocaleString()}) matches saved search`,
            reference_id: match.id,
            user_id: search.user_id,
            created_at: new Date().toISOString(),
          });

          if (alertErr) {
            errors++;
            console.error('[check-alerts] Failed to insert listing alert:', alertErr);
          } else {
            processed++;
            alerts.push({
              type: 'new_listing_match',
              detail: `${match.zip}: ${match.address}`,
            });
          }
        }
      }
    }
  } catch (err) {
    errors++;
    console.error('[check-alerts] Fatal error:', err);
  }

  console.log(`[check-alerts] Done: ${processed} alerts created, ${errors} errors`);

  return NextResponse.json({
    success: true,
    processed,
    errors,
    timestamp: new Date().toISOString(),
    alerts,
  });
}
