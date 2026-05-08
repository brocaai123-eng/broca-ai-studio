import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type VolatilityLevel = 'Low' | 'Medium' | 'High';

export interface MarketVolatilityResult {
  model_key: 'market_volatility';
  headline: string;
  score: number;
  confidence_pct: number;
  direction: 'up' | 'down' | 'stable';
  payload: {
    volatilityIndex: number;
    level: VolatilityLevel;
    avgDailySwingPct: number;
    recommendation: string;
    dataPoints: number;
    rollingVariance: number[];
  };
  model_version: string;
}

export async function runMarketVolatility(zip: string): Promise<MarketVolatilityResult | null> {
  const { data: snapshots } = await supabase
    .from('market_snapshots')
    .select('snapshot_date, median_price')
    .eq('zip', zip)
    .order('snapshot_date', { ascending: true })
    .limit(365);

  const prices = (snapshots ?? [])
    .map((s) => Number(s.median_price))
    .filter((v) => v > 0 && Number.isFinite(v));

  if (prices.length < 5) return null;

  // Calculate returns (percent change between consecutive observations)
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(((prices[i] - prices[i - 1]) / prices[i - 1]) * 100);
  }

  // EWMA (Exponentially Weighted Moving Average) variance
  // Lambda = 0.94 (standard RiskMetrics decay factor)
  const lambda = 0.94;
  let ewmaVariance = returns.reduce((a, b) => a + b * b, 0) / returns.length;
  const rollingVariance: number[] = [ewmaVariance];

  for (let i = 0; i < returns.length; i++) {
    ewmaVariance = lambda * ewmaVariance + (1 - lambda) * returns[i] ** 2;
    rollingVariance.push(ewmaVariance);
  }

  const currentVolatility = Math.sqrt(ewmaVariance);
  const avgDailySwing = returns.length > 0
    ? returns.reduce((a, b) => a + Math.abs(b), 0) / returns.length
    : 0;

  // Normalize to 0-100 index
  // Typical real estate daily swing: 0-5% is normal range
  const volatilityIndex = Math.max(0, Math.min(100, currentVolatility * 20));

  const level: VolatilityLevel =
    volatilityIndex > 60 ? 'High' :
    volatilityIndex > 30 ? 'Medium' : 'Low';

  const recommendation =
    level === 'High' ? 'High volatility — consider waiting for stabilization before transacting' :
    level === 'Medium' ? 'Moderate volatility — proceed with caution, use contingencies' :
    'Low volatility — stable window for transactions';

  // Score: lower volatility = higher score (better for investment)
  const score = Math.max(0, Math.min(100, Math.round(100 - volatilityIndex)));
  const confidence = Math.max(40, Math.min(85, 40 + Math.min(prices.length, 60) * 0.75));

  // Direction: is volatility increasing or decreasing?
  const recentVar = rollingVariance.slice(-Math.ceil(rollingVariance.length / 3));
  const olderVar = rollingVariance.slice(0, Math.ceil(rollingVariance.length / 3));
  const recentAvg = recentVar.reduce((a, b) => a + b, 0) / recentVar.length;
  const olderAvg = olderVar.reduce((a, b) => a + b, 0) / olderVar.length;
  const volTrend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

  const direction: 'up' | 'down' | 'stable' =
    volTrend > 10 ? 'up' : volTrend < -10 ? 'down' : 'stable';

  const headline = `${level} volatility | ${avgDailySwing.toFixed(1)}% avg swing | Window: ${level === 'Low' ? 'Stable for transactions' : level === 'Medium' ? 'Proceed with caution' : 'Wait for stabilization'}`;

  return {
    model_key: 'market_volatility',
    headline,
    score,
    confidence_pct: Math.round(confidence * 100) / 100,
    direction,
    payload: {
      volatilityIndex: Math.round(volatilityIndex * 100) / 100,
      level,
      avgDailySwingPct: Math.round(avgDailySwing * 1000) / 1000,
      recommendation,
      dataPoints: prices.length,
      rollingVariance: rollingVariance.slice(-20).map((v) => Math.round(v * 10000) / 10000),
    },
    model_version: 'volatility-ewma-v1',
  };
}
