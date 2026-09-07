import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const FRED_API_KEY = process.env.FRED_API_KEY || '';

interface PricePoint {
  date: string;
  y: number;
  lower?: number;
  upper?: number;
}

export interface PriceForecastResult {
  model_key: 'price_forecast';
  headline: string;
  score: number;
  confidence_pct: number;
  direction: 'up' | 'down' | 'stable';
  payload: {
    startPrice: number;
    endPrice: number;
    changePct: number;
    series: PricePoint[];
    mortgageRate: number | null;
    dataPoints: number;
  };
  model_version: string;
}

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}

function std(xs: number[]) {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

function linearFit(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length);
  const xbar = mean(xs.slice(0, n));
  const ybar = mean(ys.slice(0, n));
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xbar) * (ys[i] - ybar);
    den += (xs[i] - xbar) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = ybar - slope * xbar;
  const residuals = xs.slice(0, n).map((xi, i) => ys[i] - (slope * xi + intercept));
  return { slope, intercept, residualStd: std(residuals) };
}

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function fetchMortgageRate(): Promise<number | null> {
  if (!FRED_API_KEY) return null;
  try {
    const res = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&sort_order=desc&limit=1&api_key=${FRED_API_KEY}&file_type=json`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const val = data?.observations?.[0]?.value;
    return val && val !== '.' ? parseFloat(val) : null;
  } catch {
    return null;
  }
}

async function pricePointsFromProperties(zip: string): Promise<Array<{ date: string; y: number }>> {
  const { data } = await supabase
    .from('properties')
    .select('estimated_value, last_sale_price, last_sale_date')
    .eq('zip', zip)
    .limit(2000);

  if (!data?.length) return [];

  const sales = data
    .filter((p) => p.last_sale_price != null && p.last_sale_date)
    .map((p) => ({
      date: String(p.last_sale_date).slice(0, 10),
      y: Number(p.last_sale_price),
    }))
    .filter((p) => p.y > 0 && Number.isFinite(p.y) && /^\d{4}-\d{2}-\d{2}$/.test(p.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  const byMonth = new Map<string, number[]>();
  for (const s of sales) {
    const key = s.date.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(s.y);
  }
  const monthly: Array<{ date: string; y: number }> = [];
  for (const [month, vals] of [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sorted = [...vals].sort((a, b) => a - b);
    monthly.push({ date: `${month}-01`, y: sorted[Math.floor(sorted.length / 2)] });
  }

  const estimates = data.map((p) => Number(p.estimated_value)).filter((v) => v > 0 && Number.isFinite(v));
  if (estimates.length) {
    const sorted = [...estimates].sort((a, b) => a - b);
    monthly.push({
      date: new Date().toISOString().split('T')[0],
      y: sorted[Math.floor(sorted.length / 2)],
    });
  }
  return monthly;
}

export async function runPriceForecast(zip: string): Promise<PriceForecastResult | null> {
  const { data: snapshots } = await supabase
    .from('market_snapshots')
    .select('snapshot_date, median_price')
    .eq('zip', zip)
    .order('snapshot_date', { ascending: true })
    .limit(365);

  let points = (snapshots ?? [])
    .filter((s) => s.median_price != null && Number.isFinite(Number(s.median_price)))
    .map((s) => ({ date: s.snapshot_date as string, y: Number(s.median_price) }));

  if (points.length < 3) {
    points = await pricePointsFromProperties(zip);
  }

  if (points.length < 3) return null;

  const mortgageRate = await fetchMortgageRate();

  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.y);
  const fit = linearFit(xs, ys);

  const lastIdx = points.length - 1;
  const startPrice = fit.intercept + fit.slope * lastIdx;
  const startDate = points[lastIdx].date;

  const horizonDays = 90;
  const stepDays = 7;
  const steps = Math.floor(horizonDays / stepDays);
  const series: PricePoint[] = [];

  for (let s = 0; s <= steps; s++) {
    const forward = s * (stepDays / 30);
    const y = startPrice + fit.slope * forward;

    // Apply mortgage rate pressure: higher rates reduce price momentum
    const mortgageAdjustment = mortgageRate && mortgageRate > 6
      ? 1 - (mortgageRate - 6) * 0.005 * (s / steps)
      : 1;
    const adjusted = Math.max(0, y * mortgageAdjustment);

    const band = Math.max(0, fit.residualStd * (1.0 + (s / steps) * 0.5));
    series.push({
      date: addDays(startDate, s * stepDays),
      y: Math.round(adjusted),
      lower: Math.round(Math.max(0, adjusted - band)),
      upper: Math.round(Math.max(0, adjusted + band)),
    });
  }

  const endPrice = series[series.length - 1]?.y ?? Math.round(startPrice);
  const changePct = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
  const confidence = Math.max(50, Math.min(90,
    55 + (points.length / 60) * 20 - (fit.residualStd / Math.max(1, startPrice)) * 100,
  ));

  const direction: 'up' | 'down' | 'stable' =
    changePct > 1.5 ? 'up' : changePct < -1.5 ? 'down' : 'stable';

  const sign = changePct >= 0 ? '+' : '';
  const endDate = new Date(series[series.length - 1]?.date ?? startDate);
  const monthName = endDate.toLocaleString('en-US', { month: 'short', day: 'numeric' });
  const headline = `${sign}${changePct.toFixed(1)}% → $${endPrice.toLocaleString()} by ${monthName} | Confidence: ${Math.round(confidence)}%`;

  const score = Math.max(0, Math.min(100,
    50 + changePct * 3 + (confidence - 60) * 0.5,
  ));

  return {
    model_key: 'price_forecast',
    headline,
    score: Math.round(score * 100) / 100,
    confidence_pct: Math.round(confidence * 100) / 100,
    direction,
    payload: {
      startPrice: Math.round(startPrice),
      endPrice,
      changePct: Math.round(changePct * 100) / 100,
      series,
      mortgageRate,
      dataPoints: points.length,
    },
    model_version: 'price-lr-v2',
  };
}
