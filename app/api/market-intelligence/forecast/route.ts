import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/utils/with-timeout';
import { writePrediction } from '@/lib/services/prediction-tracker';

const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY!;

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

async function fetchRentCastMonthlyHistory(zip: string) {
  const res = await fetch(
    `https://api.rentcast.io/v1/markets?zipCode=${zip}&dataType=Sale&historyRange=12`,
    { headers: { 'X-Api-Key': RENTCAST_API_KEY, Accept: 'application/json' } },
  );
  if (!res.ok) throw new Error(`RentCast API error ${res.status}`);
  const data = await res.json();
  const sale = data?.saleData;
  const historyObj = sale?.history || {};
  const points = Object.entries(historyObj)
    .map(([key, val]) => {
      const h = val as Record<string, unknown>;
      const y = (h.medianPrice as number) ?? null;
      const date = (h.date as string) || `${key}-01`;
      return { date, y };
    })
    .filter((p) => p.date && typeof p.y === 'number' && Number.isFinite(p.y))
    .sort((a, b) => a.date.localeCompare(b.date));
  return points;
}

function addDays(isoDate: string, days: number) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}

function std(xs: number[]) {
  const m = mean(xs);
  const v = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

function linearFit(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length);
  const x = xs.slice(0, n);
  const y = ys.slice(0, n);
  const xbar = mean(x);
  const ybar = mean(y);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - xbar) * (y[i] - ybar);
    den += (x[i] - xbar) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = ybar - slope * xbar;
  const residuals = x.map((xi, i) => y[i] - (slope * xi + intercept));
  return { slope, intercept, residualStd: std(residuals) };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const zip = String(searchParams.get('zip') || '').trim();
    const force = searchParams.get('force') === '1';
    if (!zip || !/^\d{5}$/.test(zip)) return NextResponse.json({ error: 'zip is required (5 digits)' }, { status: 400 });

    const today = new Date().toISOString().split('T')[0];

    const { data: snapCount, error: countErr } = await withTimeout(
      supabaseAdmin
        .from('market_snapshots')
        .select('id', { count: 'exact', head: true })
        .eq('zip', zip),
      12000,
      'Market snapshots count',
    );
    if (countErr) throw countErr;
    const daysCollected = (snapCount as unknown as { count?: number })?.count ?? 0;

    const { data: forecast, error } = await withTimeout(
      supabaseAdmin
        .from('forecasts')
        .select('*')
        .eq('zip', zip)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      12000,
      'Forecast query',
    );
    if (error) throw error;

    // Auto-detect clearly bad cached forecasts (negative values or >200% change) and force recompute
    const forecastIsInvalid =
      forecast &&
      (forecast.predicted_value_end < 0 ||
        Math.abs(forecast.predicted_change_pct ?? 0) > 200 ||
        forecast.model_version === 'live-trend-v0-buggy');

    // If force=1 or forecast is invalid, delete so it gets recomputed below
    if (force || forecastIsInvalid) {
      if (forecast?.id) {
        await supabaseAdmin.from('forecasts').delete().eq('id', forecast.id);
      }
    } else if (forecast) {
      // Return valid cached forecast immediately
      return NextResponse.json({
        zip,
        as_of_date: forecast.start_date ?? today,
        days_collected: daysCollected,
        required_days: 180,
        forecast: {
          predicted_series: forecast.predicted_series ?? [],
          predicted_change_pct: forecast.predicted_change_pct,
          predicted_value_end: forecast.predicted_value_end,
          confidence_pct: forecast.confidence_pct,
          end_date: forecast.end_date,
          model_version: forecast.model_version,
        },
      });
    }

    // If we have no cached forecast row yet, compute a live approximation (trendline)
    // and upsert it so the next visit is instant.
    if (!forecast) {
      const history = await withTimeout(fetchRentCastMonthlyHistory(zip), 25000, 'RentCast forecast history');
      if (!history || history.length < 4) {
        return NextResponse.json({
          zip,
          as_of_date: today,
          days_collected: daysCollected,
          required_days: 180,
          forecast: null,
        });
      }

      // Fit over last 6 months for responsiveness
      const last = history.slice(-6);
      const n = last.length;
      const xs = last.map((_, i) => i);        // x = month index 0..n-1
      const ys = last.map((p) => Number(p.y));
      const fit = linearFit(xs, ys);

      // Use the fitted value at the last training point (smoothed, not raw) as start
      const lastX = n - 1;
      const startDate = last[lastX].date;
      const startVal = fit.intercept + fit.slope * lastX; // fitted value at last month
      const horizon = 90;
      const stepDays = 7; // weekly points
      const steps = Math.floor(horizon / stepDays);
      const series = [];
      for (let s = 0; s <= steps; s++) {
        // months_forward = s weeks × (7 days / 30 days per month)
        const monthsForward = s * (stepDays / 30);
        const y = startVal + fit.slope * monthsForward;
        // Widen confidence band as forecast extends further out
        const band = Math.max(0, fit.residualStd * (1.0 + (s / steps) * 0.5));
        series.push({
          date: addDays(startDate, s * stepDays),
          y: Math.round(Math.max(0, y)),
          lower: Math.round(Math.max(0, y - band)),
          upper: Math.round(Math.max(0, y + band)),
        });
      }

      const endVal = series[series.length - 1]?.y ?? Math.round(startVal);
      const changePct = startVal > 0 ? ((endVal - startVal) / startVal) * 100 : null;
      const confidence = Math.max(55, Math.min(85, 55 + (history.length / 12) * 25 - (fit.residualStd / Math.max(1, startVal)) * 100));

      // Write prediction row for accuracy tracking
      void writePrediction({
        zip,
        metric: 'price',
        model_version: 'live-trend-v0',
        predicted_value: endVal,
        confidence_score: Math.round(confidence),
      });

      const upsertRow = {
        zip,
        horizon_days: 90,
        start_date: startDate,
        end_date: addDays(startDate, horizon),
        predicted_series: series,
        predicted_change_pct: changePct,
        predicted_value_end: endVal,
        confidence_pct: confidence,
        model_version: 'live-trend-v0',
        data_days_collected: daysCollected,
        required_days: 180,
        updated_at: new Date().toISOString(),
      };

      // Avoid relying on DB unique constraints (migration may not be applied yet).
      // Do a read-then-update/insert instead of ON CONFLICT.
      const { data: existing, error: existErr } = await withTimeout(
        supabaseAdmin
          .from('forecasts')
          .select('id')
          .eq('zip', zip)
          .eq('horizon_days', 90)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        12000,
        'Forecast existing check',
      );
      if (existErr) throw existErr;

      const saved = existing?.id
        ? await (async () => {
            const { data: updated, error: updErr } = await withTimeout(
              supabaseAdmin
                .from('forecasts')
                .update(upsertRow)
                .eq('id', existing.id)
                .select('*')
                .single(),
              12000,
              'Forecast update',
            );
            if (updErr) throw updErr;
            return updated;
          })()
        : await (async () => {
            const { data: inserted, error: insErr } = await withTimeout(
              supabaseAdmin
                .from('forecasts')
                .insert(upsertRow)
                .select('*')
                .single(),
              12000,
              'Forecast insert',
            );
            if (insErr) throw insErr;
            return inserted;
          })();

      return NextResponse.json({
        zip,
        as_of_date: today,
        days_collected: daysCollected,
        required_days: saved?.required_days ?? 180,
        forecast: saved ?? null,
      });
    }

    // No data available after recompute attempt
    return NextResponse.json({
      zip,
      as_of_date: today,
      days_collected: daysCollected,
      required_days: 180,
      forecast: null,
    });
  } catch (e) {
    console.error('[market-intelligence/forecast] error', e);
    return NextResponse.json({ error: 'Failed to load forecast' }, { status: 500 });
  }
}

