/**
 * prediction-tracker.ts
 * Utility to write prediction rows into `prediction_feedback`.
 * Call writePrediction() whenever a model produces a forecasted value.
 * Call backfillActual() when the real outcome is known (run from a nightly cron).
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type PredictionMetric =
  | 'price'
  | 'inventory'
  | 'crime_trend'
  | 'energy_load'
  | 'aria_score';

export interface PredictionRecord {
  zip: string;
  metric: PredictionMetric;
  model_version: string;
  predicted_value: number;
  confidence_score?: number;
  prediction_date?: string; // ISO date, defaults to today
}

/**
 * Write a new prediction row.  Safe to call in fire-and-forget mode (don't await in hot paths).
 */
export async function writePrediction(record: PredictionRecord): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('prediction_feedback').insert({
      zip: record.zip,
      metric: record.metric,
      model_version: record.model_version,
      predicted_value: record.predicted_value,
      confidence_score: record.confidence_score ?? null,
      prediction_date: record.prediction_date ?? today,
    });
    if (error) {
      console.error('[prediction-tracker] writePrediction failed:', error.message);
    }
  } catch (e) {
    console.error('[prediction-tracker] writePrediction threw:', e);
  }
}

/**
 * Backfill the actual_value for predictions that are now resolvable.
 * Returns the number of rows updated.
 */
export async function backfillActuals(
  zip: string,
  metric: PredictionMetric,
  actualValue: number,
  forDate: string, // ISO date of the original prediction
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('prediction_feedback')
      .update({ actual_value: actualValue })
      .eq('zip', zip)
      .eq('metric', metric)
      .eq('prediction_date', forDate)
      .is('actual_value', null)
      .select('id');

    if (error) {
      console.error('[prediction-tracker] backfillActuals failed:', error.message);
      return 0;
    }
    return data?.length ?? 0;
  } catch (e) {
    console.error('[prediction-tracker] backfillActuals threw:', e);
    return 0;
  }
}
