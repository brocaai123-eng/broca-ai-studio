import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { runPriceForecast } from '@/lib/services/prediction-models/price-forecast';
import { runPopulationMigration } from '@/lib/services/prediction-models/population-migration';
import { runGridDemand } from '@/lib/services/prediction-models/grid-demand';
import { runNeighborhoodTrajectory } from '@/lib/services/prediction-models/neighborhood-trajectory';
import { runMotivatedSellerAgg } from '@/lib/services/prediction-models/motivated-seller-agg';
import { runMarketVolatility } from '@/lib/services/prediction-models/market-volatility';
import { runCrossIndustry } from '@/lib/services/prediction-models/cross-industry';

async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
  );
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const zip = String(searchParams.get('zip') || '').trim();
    const force = searchParams.get('force') === '1';
    if (!zip || !/^\d{5}$/.test(zip)) {
      return NextResponse.json({ error: 'zip is required (5 digits)' }, { status: 400 });
    }

    // Try cached predictions first (from today or most recent)
    if (!force) {
      const { data: cached } = await supabaseAdmin
        .from('model_predictions')
        .select('*')
        .eq('zip', zip)
        .order('predicted_at', { ascending: false })
        .limit(7);

      // Group by model_key, keep only latest for each
      const latestByKey = new Map<string, any>();
      for (const row of cached ?? []) {
        if (!latestByKey.has(row.model_key)) {
          latestByKey.set(row.model_key, row);
        }
      }

      if (latestByKey.size >= 3) {
        return NextResponse.json({
          zip,
          source: 'cached',
          predictions: [...latestByKey.values()],
        });
      }
    }

    // No cached data (or force refresh) — try ML service, fall back to TypeScript
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || '';
    const ML_AUTH_SECRET = process.env.ML_AUTH_SECRET || '';
    let allResults: any[] = [];
    let source = 'live';

    if (ML_SERVICE_URL) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 50_000);
        const mlRes = await fetch(`${ML_SERVICE_URL}/predict/${zip}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(ML_AUTH_SECRET ? { Authorization: `Bearer ${ML_AUTH_SECRET}` } : {}),
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (mlRes.ok) {
          const mlData = await mlRes.json();
          if (mlData.predictions?.length > 0) {
            allResults = mlData.predictions;
            source = 'ml-service';
          }
        }
      } catch { /* fall through to TypeScript models */ }
    }

    if (allResults.length === 0) {
      const [price, population, neighborhood, seller, volatility] = await Promise.allSettled([
        runPriceForecast(zip),
        runPopulationMigration(zip),
        runNeighborhoodTrajectory(zip),
        runMotivatedSellerAgg(zip),
        runMarketVolatility(zip),
      ]);

      const priceResult = price.status === 'fulfilled' ? price.value : null;
      const popResult = population.status === 'fulfilled' ? population.value : null;
      const neighborhoodResult = neighborhood.status === 'fulfilled' ? neighborhood.value : null;
      const sellerResult = seller.status === 'fulfilled' ? seller.value : null;
      const volatilityResult = volatility.status === 'fulfilled' ? volatility.value : null;

      let gridResult = null;
      try {
        gridResult = await runGridDemand(zip, popResult?.score);
      } catch { /* skip */ }

      const crossResult = runCrossIndustry(
        priceResult, popResult, gridResult,
        neighborhoodResult, sellerResult, volatilityResult,
      );

      allResults = [
        priceResult, popResult, gridResult,
        neighborhoodResult, sellerResult, volatilityResult, crossResult,
      ].filter(Boolean);
    }

    // Cache results asynchronously
    const today = new Date().toISOString().split('T')[0];
    for (const result of allResults) {
      if (!result) continue;
      const row = {
        zip,
        model_key: result.model_key,
        predicted_at: today,
        horizon_days: 90,
        headline: result.headline,
        score: result.score,
        confidence_pct: result.confidence_pct,
        direction: result.direction,
        payload: result.payload,
        model_version: result.model_version,
      };

      try {
        const { data: existing } = await supabaseAdmin
          .from('model_predictions')
          .select('id')
          .eq('zip', zip)
          .eq('model_key', result.model_key)
          .eq('predicted_at', today)
          .maybeSingle();

        if (existing?.id) {
          await supabaseAdmin.from('model_predictions').update(row).eq('id', existing.id);
        } else {
          await supabaseAdmin.from('model_predictions').insert(row);
        }
      } catch (e) {
        console.warn('[predictions] cache write failed:', e);
      }
    }

    return NextResponse.json({
      zip,
      source,
      predictions: allResults,
    });
  } catch (e) {
    console.error('[predictions] error:', e);
    return NextResponse.json({ error: 'Failed to load predictions' }, { status: 500 });
  }
}
