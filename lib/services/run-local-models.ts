import { createClient } from '@supabase/supabase-js';
import { runPriceForecast } from '@/lib/services/prediction-models/price-forecast';
import { runPopulationMigration } from '@/lib/services/prediction-models/population-migration';
import { runGridDemand } from '@/lib/services/prediction-models/grid-demand';
import { runNeighborhoodTrajectory } from '@/lib/services/prediction-models/neighborhood-trajectory';
import { runMotivatedSellerAgg } from '@/lib/services/prediction-models/motivated-seller-agg';
import { runMarketVolatility } from '@/lib/services/prediction-models/market-volatility';
import { runCrossIndustry } from '@/lib/services/prediction-models/cross-industry';
import { writePrediction } from '@/lib/services/prediction-tracker';
import { applyCalibration, computeCalibrations } from '@/lib/services/model-calibration';
import { MONITORED_ZIPS } from '@/lib/services/monitored-zips';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface LocalModelResult {
  model_key: string;
  headline: string;
  score: number;
  confidence_pct: number;
  direction: string;
  payload: Record<string, unknown>;
  model_version: string;
}

async function seedSnapshotFromProperties(zip: string, today: string): Promise<boolean> {
  const { data } = await supabase
    .from('properties')
    .select('estimated_value, last_sale_price')
    .eq('zip', zip);

  if (!data?.length) return false;
  const values = data.map((p) => Number(p.estimated_value)).filter((v) => v > 0 && Number.isFinite(v));
  const sales = data.map((p) => Number(p.last_sale_price)).filter((v) => v > 0 && Number.isFinite(v));
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted.length
    ? sorted[Math.floor(sorted.length / 2)]
    : (sales.length ? sales[Math.floor(sales.length / 2)] : 0);
  if (!median) return false;

  const { error } = await supabase.from('market_snapshots').upsert(
    {
      zip,
      snapshot_date: today,
      median_price: Math.round(median),
      active_listings: data.length,
      new_listings: data.length,
      months_of_supply: null,
      avg_days_on_market: null,
    },
    { onConflict: 'zip,snapshot_date' },
  );
  return !error;
}

export async function runTypeScriptModels(zip: string): Promise<{
  results: LocalModelResult[];
  errors: number;
}> {
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
  } catch {
    /* skip */
  }

  const crossResult = runCrossIndustry(
    priceResult,
    popResult,
    gridResult,
    neighborhoodResult,
    sellerResult,
    volatilityResult,
  );

  const failedCount = [price, population, neighborhood, seller, volatility]
    .filter((r) => r.status === 'rejected').length;

  return {
    results: [
      priceResult,
      popResult,
      gridResult,
      neighborhoodResult,
      sellerResult,
      volatilityResult,
      crossResult,
    ].filter(Boolean) as LocalModelResult[],
    errors: failedCount,
  };
}

const FEEDBACK_MAP: Record<string, { metric: string; valueKey?: string }> = {
  price_forecast: { metric: 'price', valueKey: 'endPrice,end_price' },
  population_migration: { metric: 'population_score' },
  grid_demand: { metric: 'grid_capacity_pct', valueKey: 'capacityUtilPct,capacity_util_pct' },
  neighborhood_trajectory: { metric: 'neighborhood_score' },
  motivated_seller_agg: { metric: 'seller_avg_score', valueKey: 'avgScore,avg_score' },
  market_volatility: { metric: 'volatility_index', valueKey: 'volatilityIndex,volatility_index' },
};

function predictedFromResult(result: LocalModelResult): number {
  const mapping = FEEDBACK_MAP[result.model_key];
  if (mapping?.valueKey) {
    for (const k of mapping.valueKey.split(',')) {
      const v = result.payload?.[k];
      if (v != null) return Number(v);
    }
  }
  return result.score;
}

export async function persistModelResults(zip: string, results: LocalModelResult[], today: string) {
  let modelsRun = 0;
  let errors = 0;
  for (const result of results) {
    try {
      const mapping = FEEDBACK_MAP[result.model_key];
      let predictedValue = predictedFromResult(result);
      if (mapping) {
        predictedValue = await applyCalibration(mapping.metric, result.model_version, predictedValue);
      }

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
      if (mapping) {
        void writePrediction({
          zip,
          metric: mapping.metric as any,
          model_version: result.model_version,
          predicted_value: predictedValue,
          confidence_score: result.confidence_pct,
        });
      }
    } catch (e) {
      console.error(`[local-models] persist error for ${zip}/${result.model_key}:`, e);
      errors++;
    }
  }
  return { modelsRun, errors };
}

async function resolveSellerActuals() {
  const { data: pending } = await supabase
    .from('prediction_feedback')
    .select('id, zip')
    .eq('metric', 'seller_avg_score')
    .is('actual_value', null)
    .limit(200);

  let resolved = 0;
  for (const row of pending ?? []) {
    const { data: props } = await supabase
      .from('properties')
      .select('motivated_seller_score')
      .eq('zip', row.zip)
      .not('motivated_seller_score', 'is', null);
    if (!props?.length) continue;
    const avg = Math.round(
      props.reduce((s, p) => s + (Number(p.motivated_seller_score) || 0), 0) / props.length,
    );
    const { error } = await supabase
      .from('prediction_feedback')
      .update({ actual_value: avg })
      .eq('id', row.id);
    if (!error) resolved++;
  }
  return resolved;
}

/** Seed snapshots from properties, run TS models, persist, then learn bias from resolved rows. */
export async function runLocalTraining(zips: string[] = MONITORED_ZIPS) {
  const today = new Date().toISOString().split('T')[0];
  const details: Array<{ zip: string; models: number; errors: number; snapshot: boolean }> = [];

  for (const zip of zips) {
    const snapshot = await seedSnapshotFromProperties(zip, today);
    const ts = await runTypeScriptModels(zip);
    const persisted = await persistModelResults(zip, ts.results, today);
    details.push({
      zip,
      models: persisted.modelsRun,
      errors: persisted.errors + ts.errors,
      snapshot,
    });
  }

  const sellerResolved = await resolveSellerActuals();
  const calibrations = await computeCalibrations();
  const totalModels = details.reduce((s, r) => s + r.models, 0);
  return {
    success: true,
    source: 'local-typescript',
    totalModels,
    sellerResolved,
    calibrations: calibrations.length,
    timestamp: new Date().toISOString(),
    details,
  };
}
