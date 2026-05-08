import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runPriceForecast } from '@/lib/services/prediction-models/price-forecast';
import { runPopulationMigration } from '@/lib/services/prediction-models/population-migration';
import { runGridDemand } from '@/lib/services/prediction-models/grid-demand';
import { runNeighborhoodTrajectory } from '@/lib/services/prediction-models/neighborhood-trajectory';
import { runMotivatedSellerAgg } from '@/lib/services/prediction-models/motivated-seller-agg';
import { runMarketVolatility } from '@/lib/services/prediction-models/market-volatility';
import { runCrossIndustry } from '@/lib/services/prediction-models/cross-industry';
import { writePrediction } from '@/lib/services/prediction-tracker';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || '';
const ML_AUTH_SECRET = process.env.ML_AUTH_SECRET || '';

const MONITORED_ZIPS = [
  '33470', '33411', '33401', '33413', '33418',
  '33458', '33467', '33328', '33309', '33063',
];

export const maxDuration = 120;

// ── Python ML Service call ──────────────────────────────────────────────────

interface MLPrediction {
  model_key: string;
  headline: string;
  score: number;
  confidence_pct: number;
  direction: string;
  payload: Record<string, unknown>;
  model_version: string;
}

async function callMLService(zip: string): Promise<MLPrediction[] | null> {
  if (!ML_SERVICE_URL) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    const res = await fetch(`${ML_SERVICE_URL}/predict/${zip}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ML_AUTH_SECRET ? { Authorization: `Bearer ${ML_AUTH_SECRET}` } : {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[run-predictions] ML service returned ${res.status} for ${zip}`);
      return null;
    }

    const data = await res.json();
    return data.predictions ?? null;
  } catch (e) {
    console.warn(`[run-predictions] ML service call failed for ${zip}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

// ── TypeScript fallback (existing models) ───────────────────────────────────

async function runTypeScriptModels(zip: string) {
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

  const failedCount = [price, population, neighborhood, seller, volatility]
    .filter((r) => r.status === 'rejected').length;

  return {
    results: [priceResult, popResult, gridResult, neighborhoodResult, sellerResult, volatilityResult, crossResult].filter(Boolean) as Array<{ model_key: string; headline: string; score: number; confidence_pct: number; direction: string; payload: Record<string, unknown>; model_version: string }>,
    errors: failedCount,
  };
}

// ── Feedback writer ─────────────────────────────────────────────────────────

function writeFeedbackForResult(zip: string, result: MLPrediction) {
  const feedbackMap: Record<string, { metric: string; valueKey?: string }> = {
    price_forecast: { metric: 'price', valueKey: 'endPrice,end_price' },
    population_migration: { metric: 'population_score' },
    grid_demand: { metric: 'grid_capacity_pct', valueKey: 'capacityUtilPct,capacity_util_pct' },
    neighborhood_trajectory: { metric: 'neighborhood_score' },
    motivated_seller_agg: { metric: 'seller_avg_score', valueKey: 'avgScore,avg_score' },
    market_volatility: { metric: 'volatility_index', valueKey: 'volatilityIndex,volatility_index' },
  };

  const mapping = feedbackMap[result.model_key];
  if (!mapping) return;

  let predictedValue: number | null = null;
  if (mapping.valueKey) {
    const keys = mapping.valueKey.split(',');
    for (const k of keys) {
      const v = (result.payload as Record<string, unknown>)?.[k];
      if (v != null) {
        predictedValue = Number(v);
        break;
      }
    }
  }
  if (predictedValue == null) predictedValue = result.score;

  void writePrediction({
    zip,
    metric: mapping.metric as any,
    model_version: result.model_version,
    predicted_value: predictedValue,
    confidence_score: result.confidence_pct,
  });
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];
  const results: Array<{ zip: string; models: number; errors: number; source: string }> = [];

  for (const zip of MONITORED_ZIPS) {
    let modelsRun = 0;
    let errors = 0;
    let source = 'typescript';

    // Try ML service first, fall back to TypeScript
    const mlResults = await callMLService(zip);
    let allResults: MLPrediction[];

    if (mlResults && mlResults.length > 0) {
      allResults = mlResults;
      source = 'ml-service';
    } else {
      const tsOutput = await runTypeScriptModels(zip);
      allResults = tsOutput.results;
      errors += tsOutput.errors;
    }

    // Persist to model_predictions + prediction_feedback
    for (const result of allResults) {
      try {
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

        const { data: existing } = await supabase
          .from('model_predictions')
          .select('id')
          .eq('zip', zip)
          .eq('model_key', result.model_key)
          .eq('predicted_at', today)
          .maybeSingle();

        if (existing?.id) {
          await supabase.from('model_predictions').update(row).eq('id', existing.id);
        } else {
          await supabase.from('model_predictions').insert(row);
        }

        modelsRun++;

        // Write accuracy tracking feedback
        writeFeedbackForResult(zip, result);
      } catch (e) {
        console.error(`[run-predictions] upsert error for ${zip}/${result.model_key}:`, e);
        errors++;
      }
    }

    results.push({ zip, models: modelsRun, errors, source });
  }

  const totalModels = results.reduce((s, r) => s + r.models, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors, 0);
  const mlCount = results.filter((r) => r.source === 'ml-service').length;

  console.log(`[run-predictions] Done: ${totalModels} models, ${totalErrors} errors, ${mlCount}/${MONITORED_ZIPS.length} via ML service`);

  return NextResponse.json({
    success: true,
    totalModels,
    totalErrors,
    mlServiceUsed: mlCount,
    timestamp: new Date().toISOString(),
    details: results,
  });
}
