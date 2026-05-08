import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const CENSUS_API_KEY = process.env.CENSUS_API_KEY || '';

type Stage = 'Early Gentrification' | 'Active Gentrification' | 'Stable' | 'Decline';
type Recommendation = 'BUY' | 'HOLD' | 'SELL';

export interface NeighborhoodTrajectoryResult {
  model_key: 'neighborhood_trajectory';
  headline: string;
  score: number;
  confidence_pct: number;
  direction: 'up' | 'down' | 'stable';
  payload: {
    stage: Stage;
    recommendation: Recommendation;
    factors: Array<{ name: string; signal: number; weight: number; detail: string }>;
    crimeDirection: string;
    priceDirection: string;
    demographicShift: string;
  };
  model_version: string;
}

function trendDirection(values: number[]): number {
  if (values.length < 2) return 0;
  const half = Math.ceil(values.length / 2);
  const recent = values.slice(-half);
  const older = values.slice(0, half);
  const rAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const oAvg = older.reduce((a, b) => a + b, 0) / older.length;
  if (oAvg === 0) return 0;
  return ((rAvg - oAvg) / oAvg) * 100;
}

async function fetchCensusDemographics(zip: string) {
  if (!CENSUS_API_KEY) return null;
  try {
    const vars = 'B01003_001E,B19013_001E,B25003_002E,B25003_003E';
    const res = await fetch(
      `https://api.census.gov/data/2022/acs/acs5?get=${vars}&for=zip%20code%20tabulation%20area:${zip}&key=${CENSUS_API_KEY}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows || rows.length < 2) return null;
    const d = rows[1];
    const owners = Number(d[2]) || 0;
    const renters = Number(d[3]) || 0;
    return {
      population: Number(d[0]) || null,
      medianIncome: Number(d[1]) || null,
      ownerRatio: (owners + renters) > 0 ? owners / (owners + renters) : null,
    };
  } catch {
    return null;
  }
}

export async function runNeighborhoodTrajectory(zip: string): Promise<NeighborhoodTrajectoryResult | null> {
  const [crimeData, newsData, snapshots, demographics] = await Promise.all([
    supabase
      .from('crime_records')
      .select('incident_count, record_date')
      .eq('zip', zip)
      .order('record_date', { ascending: true })
      .limit(90),
    supabase
      .from('news_signals')
      .select('sentiment, published_at')
      .eq('zip', zip)
      .order('published_at', { ascending: false })
      .limit(30),
    supabase
      .from('market_snapshots')
      .select('median_price, snapshot_date')
      .eq('zip', zip)
      .order('snapshot_date', { ascending: true })
      .limit(90),
    fetchCensusDemographics(zip),
  ]);

  const factors: NeighborhoodTrajectoryResult['payload']['factors'] = [];
  let compositeSignal = 0;
  let totalWeight = 0;
  let confidence = 40;

  // Crime trend: declining crime = positive signal
  const crimeValues = (crimeData.data ?? []).map((c) => Number(c.incident_count) || 0);
  const crimeTrend = trendDirection(crimeValues);
  const crimeSignal = crimeTrend < -5 ? 1 : crimeTrend > 10 ? -1 : 0;
  const crimeDir = crimeTrend < -5 ? 'Declining (positive)' : crimeTrend > 10 ? 'Rising (negative)' : 'Stable';
  factors.push({ name: 'Crime Trend', signal: crimeSignal, weight: 0.25, detail: `${crimeTrend.toFixed(1)}% change` });
  compositeSignal += crimeSignal * 0.25;
  totalWeight += 0.25;
  if (crimeValues.length > 5) confidence += 10;

  // Price trend: rising prices = gentrification signal
  const priceValues = (snapshots.data ?? []).map((s) => Number(s.median_price) || 0).filter((v) => v > 0);
  const priceTrend = trendDirection(priceValues);
  const priceSignal = priceTrend > 3 ? 1 : priceTrend < -3 ? -1 : 0;
  const priceDir = priceTrend > 3 ? 'Rising' : priceTrend < -3 ? 'Declining' : 'Stable';
  factors.push({ name: 'Price Trend', signal: priceSignal, weight: 0.25, detail: `${priceTrend.toFixed(1)}% change` });
  compositeSignal += priceSignal * 0.25;
  totalWeight += 0.25;
  if (priceValues.length > 5) confidence += 10;

  // News sentiment: positive sentiment = growth signal
  const newsItems = newsData.data ?? [];
  const sentimentValues: number[] = newsItems
    .map((n) => {
      const s = (n.sentiment as string)?.toLowerCase();
      return s === 'positive' || s === 'buy' ? 1 : s === 'negative' || s === 'sell' ? -1 : 0;
    });
  const avgSentiment = sentimentValues.length > 0
    ? sentimentValues.reduce((a: number, b: number) => a + b, 0) / sentimentValues.length
    : 0;
  const newsSignal = avgSentiment > 0.2 ? 1 : avgSentiment < -0.2 ? -1 : 0;
  factors.push({ name: 'News Sentiment', signal: newsSignal, weight: 0.20, detail: `avg ${avgSentiment.toFixed(2)}` });
  compositeSignal += newsSignal * 0.20;
  totalWeight += 0.20;
  if (newsItems.length > 3) confidence += 5;

  // Demographics: high income + high owner ratio = stability/gentrification
  let demoShift = 'Unknown';
  if (demographics) {
    const incomeSignal = demographics.medianIncome
      ? (demographics.medianIncome > 80000 ? 1 : demographics.medianIncome > 50000 ? 0.5 : 0)
      : 0;
    const ownerSignal = demographics.ownerRatio
      ? (demographics.ownerRatio > 0.6 ? 0.5 : demographics.ownerRatio < 0.3 ? -0.5 : 0)
      : 0;
    const demoVal = (incomeSignal + ownerSignal) / 2;
    factors.push({ name: 'Demographics', signal: demoVal, weight: 0.30, detail: `Income: $${(demographics.medianIncome ?? 0).toLocaleString()}, Owner: ${demographics.ownerRatio ? (demographics.ownerRatio * 100).toFixed(0) + '%' : 'N/A'}` });
    compositeSignal += demoVal * 0.30;
    totalWeight += 0.30;
    confidence += 10;
    demoShift = demoVal > 0.3 ? 'Upgrading' : demoVal < -0.3 ? 'Declining' : 'Stable';
  }

  if (totalWeight > 0) compositeSignal /= totalWeight;

  // Map composite signal to stage
  let stage: Stage;
  let recommendation: Recommendation;
  if (compositeSignal > 0.5) {
    stage = 'Active Gentrification';
    recommendation = 'BUY';
  } else if (compositeSignal > 0.15) {
    stage = 'Early Gentrification';
    recommendation = 'BUY';
  } else if (compositeSignal > -0.15) {
    stage = 'Stable';
    recommendation = 'HOLD';
  } else {
    stage = 'Decline';
    recommendation = 'SELL';
  }

  const score = Math.max(0, Math.min(100, Math.round(50 + compositeSignal * 50)));
  confidence = Math.max(30, Math.min(85, confidence));

  const direction: 'up' | 'down' | 'stable' =
    compositeSignal > 0.15 ? 'up' : compositeSignal < -0.15 ? 'down' : 'stable';

  const headline = `${stage} | Score: ${score} | Recommendation: ${recommendation}`;

  return {
    model_key: 'neighborhood_trajectory',
    headline,
    score,
    confidence_pct: Math.round(confidence * 100) / 100,
    direction,
    payload: {
      stage,
      recommendation,
      factors,
      crimeDirection: crimeDir,
      priceDirection: priceDir,
      demographicShift: demoShift,
    },
    model_version: 'neighborhood-classify-v1',
  };
}
