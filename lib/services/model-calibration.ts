import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface Calibration {
  metric: string;
  model_version: string;
  sample_count: number;
  bias: number;
}

/**
 * Learn a simple bias (predicted − actual) from resolved feedback
 * so the next run can correct systematic over/under-shooting.
 */
export async function computeCalibrations(): Promise<Calibration[]> {
  const { data, error } = await supabase
    .from('prediction_feedback')
    .select('metric, model_version, predicted_value, actual_value')
    .not('actual_value', 'is', null)
    .limit(2000);

  if (error || !data?.length) return [];

  const buckets = new Map<string, { metric: string; model_version: string; diffs: number[] }>();
  for (const row of data) {
    const pred = Number(row.predicted_value);
    const actual = Number(row.actual_value);
    if (!Number.isFinite(pred) || !Number.isFinite(actual)) continue;
    const key = `${row.metric}__${row.model_version || 'unknown'}`;
    if (!buckets.has(key)) {
      buckets.set(key, { metric: row.metric, model_version: row.model_version || 'unknown', diffs: [] });
    }
    buckets.get(key)!.diffs.push(pred - actual);
  }

  const out: Calibration[] = [];
  for (const b of buckets.values()) {
    if (b.diffs.length < 3) continue;
    const bias = b.diffs.reduce((s, d) => s + d, 0) / b.diffs.length;
    const row = {
      metric: b.metric,
      model_version: b.model_version,
      sample_count: b.diffs.length,
      bias: Math.round(bias * 1000) / 1000,
      trained_at: new Date().toISOString(),
    };
    const { error: calErr } = await supabase
      .from('model_calibration')
      .upsert(row, { onConflict: 'metric,model_version' });
    if (calErr) {
      console.warn('[model-calibration] upsert skipped:', calErr.message);
    } else {
      out.push(row);
    }
  }
  return out;
}

export async function applyCalibration(
  metric: string,
  modelVersion: string,
  value: number,
): Promise<number> {
  const { data } = await supabase
    .from('model_calibration')
    .select('bias, sample_count')
    .eq('metric', metric)
    .eq('model_version', modelVersion)
    .maybeSingle();
  if (!data || !data.sample_count || data.sample_count < 3) return value;
  return value - Number(data.bias || 0);
}
