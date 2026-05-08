import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const CENSUS_API_KEY = process.env.CENSUS_API_KEY || '';

export interface PopulationMigrationResult {
  model_key: 'population_migration';
  headline: string;
  score: number;
  confidence_pct: number;
  direction: 'up' | 'down' | 'stable';
  payload: {
    population: number | null;
    medianIncome: number | null;
    newListingTrend: number;
    energyTrend: number;
    buildingPermits: number | null;
    businessEstablishments: number | null;
    factors: Array<{ name: string; value: number; weight: number; signal: string }>;
  };
  model_version: string;
}

async function fetchCensusACS(zip: string): Promise<{ population: number | null; medianIncome: number | null }> {
  if (!CENSUS_API_KEY) return { population: null, medianIncome: null };
  try {
    const vars = 'B01003_001E,B19013_001E';
    const res = await fetch(
      `https://api.census.gov/data/2022/acs/acs5?get=${vars}&for=zip%20code%20tabulation%20area:${zip}&key=${CENSUS_API_KEY}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return { population: null, medianIncome: null };
    const rows = await res.json();
    if (!rows || rows.length < 2) return { population: null, medianIncome: null };
    const [, dataRow] = rows;
    return {
      population: dataRow[0] ? Number(dataRow[0]) : null,
      medianIncome: dataRow[1] ? Number(dataRow[1]) : null,
    };
  } catch {
    return { population: null, medianIncome: null };
  }
}

async function fetchZBP(zip: string): Promise<number | null> {
  if (!CENSUS_API_KEY) return null;
  try {
    const res = await fetch(
      `https://api.census.gov/data/2021/zbp?get=ESTAB&for=zipcode:${zip}&key=${CENSUS_API_KEY}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows || rows.length < 2) return null;
    return Number(rows[1][0]) || null;
  } catch {
    return null;
  }
}

async function fetchBuildingPermits(zip: string): Promise<number | null> {
  if (!CENSUS_API_KEY) return null;
  try {
    // BPS uses county FIPS; approximate from first 3 chars of ZIP (not exact but directional)
    const res = await fetch(
      `https://api.census.gov/data/2023/bps?get=BLDGS&for=county:*&in=state:12&key=${CENSUS_API_KEY}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows || rows.length < 2) return null;
    const total = rows.slice(1).reduce((s: number, r: any[]) => s + (Number(r[0]) || 0), 0);
    return total;
  } catch {
    return null;
  }
}

function trendFromSeries(values: number[]): number {
  if (values.length < 2) return 0;
  const recent = values.slice(-Math.min(10, values.length));
  const older = values.slice(0, Math.min(10, Math.floor(values.length / 2)));
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  if (olderAvg === 0) return 0;
  return ((recentAvg - olderAvg) / olderAvg) * 100;
}

export async function runPopulationMigration(zip: string): Promise<PopulationMigrationResult | null> {
  const [census, zbp, permits, snapshots, energyData] = await Promise.all([
    fetchCensusACS(zip),
    fetchZBP(zip),
    fetchBuildingPermits(zip),
    supabase
      .from('market_snapshots')
      .select('new_listings')
      .eq('zip', zip)
      .order('snapshot_date', { ascending: true })
      .limit(90),
    supabase
      .from('energy_data')
      .select('consumption_mwh')
      .eq('state', 'FL')
      .order('collected_at', { ascending: true })
      .limit(52),
  ]);

  const newListings = (snapshots.data ?? []).map((s) => Number(s.new_listings) || 0);
  const newListingTrend = trendFromSeries(newListings);

  const energyValues = (energyData.data ?? []).map((e) => Number(e.consumption_mwh) || 0).filter((v) => v > 0);
  const energyTrend = trendFromSeries(energyValues);

  const factors: PopulationMigrationResult['payload']['factors'] = [];

  // Population score (0-100 scale based on size and proxies)
  let compositeScore = 50;
  let totalWeight = 0;
  let confidence = 45;

  // Factor 1: New listing trend (proxy for construction/demand)
  const listingSignal = newListingTrend > 5 ? 'up' : newListingTrend < -5 ? 'down' : 'stable';
  const listingScore = Math.max(0, Math.min(100, 50 + newListingTrend * 2));
  factors.push({ name: 'New Listing Trend', value: Math.round(newListingTrend * 10) / 10, weight: 0.25, signal: listingSignal });
  compositeScore += listingScore * 0.25;
  totalWeight += 0.25;
  if (newListings.length > 5) confidence += 10;

  // Factor 2: Energy consumption trend (proxy for population activity)
  const energySignal = energyTrend > 2 ? 'up' : energyTrend < -2 ? 'down' : 'stable';
  const energyScore = Math.max(0, Math.min(100, 50 + energyTrend * 3));
  factors.push({ name: 'Energy Consumption Trend', value: Math.round(energyTrend * 10) / 10, weight: 0.20, signal: energySignal });
  compositeScore += energyScore * 0.20;
  totalWeight += 0.20;
  if (energyValues.length > 3) confidence += 5;

  // Factor 3: Census population (static baseline)
  if (census.population) {
    const popScore = census.population > 50000 ? 70 : census.population > 20000 ? 60 : 50;
    factors.push({ name: 'Census Population', value: census.population, weight: 0.25, signal: 'stable' });
    compositeScore += popScore * 0.25;
    totalWeight += 0.25;
    confidence += 15;
  }

  // Factor 4: Business establishments (economic activity)
  if (zbp) {
    const bizScore = zbp > 1000 ? 75 : zbp > 500 ? 65 : zbp > 100 ? 55 : 45;
    factors.push({ name: 'Business Establishments', value: zbp, weight: 0.15, signal: zbp > 500 ? 'up' : 'stable' });
    compositeScore += bizScore * 0.15;
    totalWeight += 0.15;
    confidence += 10;
  }

  // Factor 5: Building permits
  if (permits) {
    const permitScore = permits > 5000 ? 75 : permits > 2000 ? 65 : 50;
    factors.push({ name: 'Building Permits (State)', value: permits, weight: 0.15, signal: permits > 3000 ? 'up' : 'stable' });
    compositeScore += permitScore * 0.15;
    totalWeight += 0.15;
    confidence += 5;
  }

  if (totalWeight > 0) {
    compositeScore = compositeScore / totalWeight;
  }

  const score = Math.max(0, Math.min(100, Math.round(compositeScore)));
  confidence = Math.max(30, Math.min(85, confidence));
  const projectedGrowthPct = (score - 50) * 0.1;
  const direction: 'up' | 'down' | 'stable' =
    projectedGrowthPct > 0.5 ? 'up' : projectedGrowthPct < -0.5 ? 'down' : 'stable';

  const dirLabel = direction === 'up' ? 'Moderate inflow expected' :
    direction === 'down' ? 'Outflow pressure detected' : 'Stable population';
  const sign = projectedGrowthPct >= 0 ? '+' : '';
  const headline = `${dirLabel} | ${sign}${projectedGrowthPct.toFixed(1)}% projected growth | Score: ${score}`;

  return {
    model_key: 'population_migration',
    headline,
    score,
    confidence_pct: Math.round(confidence * 100) / 100,
    direction,
    payload: {
      population: census.population,
      medianIncome: census.medianIncome,
      newListingTrend: Math.round(newListingTrend * 10) / 10,
      energyTrend: Math.round(energyTrend * 10) / 10,
      buildingPermits: permits,
      businessEstablishments: zbp,
      factors,
    },
    model_version: 'pop-composite-v1',
  };
}
