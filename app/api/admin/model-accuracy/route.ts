import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  // Admin-only — verify user is admin via service role check
  const authHeader = request.headers.get('authorization');
  let userId: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data } = await supabase.auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(365, Math.max(7, Number(searchParams.get('days') || 90)));
  const zip = searchParams.get('zip') || null;
  const metric = searchParams.get('metric') || null;
  const modelVersion = searchParams.get('model') || null;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().split('T')[0];

  let query = supabase
    .from('prediction_feedback')
    .select('id, zip, metric, model_version, prediction_date, predicted_value, actual_value, confidence_score')
    .gte('prediction_date', sinceDate)
    .not('actual_value', 'is', null)       // only resolved rows
    .order('prediction_date', { ascending: false })
    .limit(1000);

  if (zip) query = query.eq('zip', zip);
  if (metric) query = query.eq('metric', metric);
  if (modelVersion) query = query.eq('model_version', modelVersion);

  const { data: rows, error } = await query;
  if (error) {
    console.error('[model-accuracy] query error:', error);
    return NextResponse.json({ error: 'Failed to load accuracy data' }, { status: 500 });
  }

  // Also fetch pending rows (no actual yet) so we can display them
  let pendingQuery = supabase
    .from('prediction_feedback')
    .select('id, zip, metric, model_version, prediction_date, predicted_value, confidence_score')
    .gte('prediction_date', sinceDate)
    .is('actual_value', null)
    .order('prediction_date', { ascending: false })
    .limit(100);
  if (zip) pendingQuery = pendingQuery.eq('zip', zip);
  if (metric) pendingQuery = pendingQuery.eq('metric', metric);
  const { data: pendingRows, count: pendingCount } = await pendingQuery;

  // Compute per-row error metrics
  interface PredictionRow {
    id: string;
    zip: string;
    metric: string;
    model_version: string;
    prediction_date: string;
    predicted_value: number;
    actual_value: number;
    confidence_score: number | null;
    error_pct: number | null;
    abs_error: number | null;
    status: 'OK' | 'REVIEW' | 'POOR';
  }

  const enriched: PredictionRow[] = (rows ?? []).map((r) => {
    const pred = Number(r.predicted_value);
    const actual = Number(r.actual_value);
    const errPct = actual !== 0 ? ((pred - actual) / actual) * 100 : null;
    const absErr = actual !== 0 ? Math.abs(errPct!) : null;
    const status: PredictionRow['status'] =
      absErr === null ? 'OK' :
      absErr <= 5 ? 'OK' :
      absErr <= 10 ? 'REVIEW' : 'POOR';
    return { ...r, error_pct: errPct !== null ? Math.round(errPct * 10) / 10 : null, abs_error: absErr !== null ? Math.round(absErr * 10) / 10 : null, status };
  });

  // Aggregate by model_version + metric
  interface VersionSummary {
    model_version: string;
    metric: string;
    count: number;
    avg_abs_error_pct: number;
    accuracy_pct: number; // % rows with abs_error <= 5%
    ok: number;
    review: number;
    poor: number;
  }

  const versionMap: Record<string, VersionSummary> = {};
  for (const r of enriched) {
    const key = `${r.model_version}__${r.metric}`;
    if (!versionMap[key]) {
      versionMap[key] = { model_version: r.model_version, metric: r.metric, count: 0, avg_abs_error_pct: 0, accuracy_pct: 0, ok: 0, review: 0, poor: 0 };
    }
    const v = versionMap[key];
    v.count++;
    v.avg_abs_error_pct += r.abs_error ?? 0;
    if (r.status === 'OK') v.ok++;
    else if (r.status === 'REVIEW') v.review++;
    else v.poor++;
  }

  const versionSummary = Object.values(versionMap).map((v) => ({
    ...v,
    avg_abs_error_pct: v.count > 0 ? Math.round((v.avg_abs_error_pct / v.count) * 10) / 10 : 0,
    accuracy_pct: v.count > 0 ? Math.round((v.ok / v.count) * 1000) / 10 : 0,
  }));

  return NextResponse.json({
    rows: enriched,
    pending_rows: pendingRows ?? [],
    version_summary: versionSummary,
    pending_count: (pendingRows ?? []).length,
    total_resolved: enriched.length,
    filters: { days, zip, metric, modelVersion },
  });
}
