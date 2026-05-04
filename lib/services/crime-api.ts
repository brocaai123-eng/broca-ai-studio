// FBI UCR 2022 published crime rates (per 100,000 residents)
// Source: FBI Crime Data Explorer, Table 4 — State crime estimates 2022
const FL_UCR_2022 = {
  violent_rate: 198.7,      // Florida violent crime rate
  property_rate: 1748.4,    // Florida property crime rate
  national_violent: 380.7,  // US national average
  national_property: 1954.4,
};

// Category distribution derived from FL UCR offense breakdown (2022)
// Theft ~53%, Burglary ~11%, Assault ~24%, Robbery ~7%, Other ~5%
const FL_CATEGORY_DIST = [
  { category: 'Theft / Larceny', violent: false, pct: 0.53 },
  { category: 'Assault',         violent: true,  pct: 0.24 },
  { category: 'Burglary',        violent: false, pct: 0.11 },
  { category: 'Robbery',         violent: true,  pct: 0.07 },
  { category: 'Motor Vehicle Theft', violent: false, pct: 0.05 },
];

export interface CrimeScore {
  zip: string;
  total_incidents: number;
  violent_crimes: number;
  property_crimes: number;
  score: number; // 0-100, higher = safer
  national_comparison: string;
  trend_5yr: 'improving' | 'worsening' | 'stable';
  is_estimated: boolean;
}

export interface CrimeBreakdown {
  category: string;
  count: number;
  per_capita: number;
  trend: 'up' | 'down' | 'flat';
}

/**
 * Estimate annual crime incidents for a ZIP from census population
 * using published FL UCR 2022 state-level rates.
 */
export function estimateCrimeFromPopulation(population: number): {
  breakdown: CrimeBreakdown[];
  total: number;
  violent: number;
  property: number;
} {
  const totalRate = FL_UCR_2022.violent_rate + FL_UCR_2022.property_rate;
  const totalPerYear = Math.round((population * totalRate) / 100_000);

  const breakdown: CrimeBreakdown[] = FL_CATEGORY_DIST.map(d => {
    const count = Math.round(totalPerYear * d.pct);
    return {
      category: d.category,
      count,
      per_capita: population > 0 ? Math.round((count / population) * 100_000) : 0,
      trend: 'flat' as const,
    };
  });

  const violent = breakdown
    .filter((_, i) => FL_CATEGORY_DIST[i].violent)
    .reduce((s, b) => s + b.count, 0);
  const property = totalPerYear - violent;

  return { breakdown, total: totalPerYear, violent, property };
}

/**
 * Returns Florida 2022 UCR published crime rates (always real, no API needed).
 */
export async function getFBICrimeData(_stateAbbr: string = 'FL'): Promise<{
  violent_rate: number;
  property_rate: number;
  national_avg_violent: number;
  national_avg_property: number;
}> {
  // The FBI SAPI and CDE APIs have been intermittently unavailable.
  // Return the authoritative published UCR 2022 values directly.
  return {
    violent_rate: FL_UCR_2022.violent_rate,
    property_rate: FL_UCR_2022.property_rate,
    national_avg_violent: FL_UCR_2022.national_violent,
    national_avg_property: FL_UCR_2022.national_property,
  };
}

/**
 * getSocrataCrimeByZip — kept for future use when correct dataset IDs are available.
 * Currently returns null to signal "no local data" so the caller falls back to estimates.
 */
export async function getSocrataCrimeByZip(_zip: string, _county?: string): Promise<CrimeBreakdown[] | null> {
  // Miami-Dade / Broward Socrata endpoints are currently unavailable.
  // Returning null lets calculateCrimeScore use the census-based estimate instead.
  return null;
}

/**
 * calculateCrimeScore — main entry point.
 * Accepts an optional population; if provided and Socrata returns no data,
 * uses FL UCR rates × population to estimate real crime counts.
 */
export async function calculateCrimeScore(zip: string, population?: number | null): Promise<CrimeScore> {
  const [socrataResult, fbiData] = await Promise.all([
    getSocrataCrimeByZip(zip),
    getFBICrimeData('FL'),
  ]);

  let breakdown: CrimeBreakdown[];
  let totalIncidents: number;
  let violentCrimes: number;
  let propertyCrimes: number;
  let isEstimated = false;

  const liveData = socrataResult && socrataResult.reduce((s, b) => s + b.count, 0) > 0;

  if (liveData && socrataResult) {
    // Real local incident data from Socrata
    breakdown = socrataResult;
    totalIncidents = breakdown.reduce((sum, b) => sum + b.count, 0);
    violentCrimes = breakdown
      .filter(b => ['assault', 'robbery', 'homicide', 'rape'].some(v => b.category.toLowerCase().includes(v)))
      .reduce((sum, b) => sum + b.count, 0);
    propertyCrimes = totalIncidents - violentCrimes;
  } else if (population && population > 0) {
    // Estimate from FL UCR 2022 state rate × census population
    const est = estimateCrimeFromPopulation(population);
    breakdown = est.breakdown;
    totalIncidents = est.total;
    violentCrimes = est.violent;
    propertyCrimes = est.property;
    isEstimated = true;
  } else {
    // No population data available — return zeros
    breakdown = [
      { category: 'Theft / Larceny', count: 0, per_capita: 0, trend: 'flat' },
      { category: 'Assault',         count: 0, per_capita: 0, trend: 'flat' },
      { category: 'Burglary',        count: 0, per_capita: 0, trend: 'flat' },
    ];
    totalIncidents = 0;
    violentCrimes = 0;
    propertyCrimes = 0;
  }

  // Score: compare to FL state rate. > state rate = lower score.
  // Use per-capita if we have population, otherwise estimate from raw count.
  const pop = population && population > 0 ? population : 10_000;
  const localRate = (totalIncidents / pop) * 100_000;
  const stateRate = FL_UCR_2022.violent_rate + FL_UCR_2022.property_rate;
  const ratio = stateRate > 0 ? localRate / stateRate : 1;
  // ratio < 1 means safer than FL average → higher score
  const rawScore = Math.max(0, Math.min(100, Math.round(100 - (ratio * 50))));
  const score = isEstimated ? 50 : rawScore; // Neutral 50 for estimates (no local data advantage)

  const comparison =
    localRate < FL_UCR_2022.national_violent + FL_UCR_2022.national_property
      ? `Below national average (FL avg: ${stateRate.toFixed(0)}/100k vs national: ${(FL_UCR_2022.national_violent + FL_UCR_2022.national_property).toFixed(0)}/100k)`
      : `Above national average (FL avg: ${stateRate.toFixed(0)}/100k)`;

  return {
    zip,
    total_incidents: totalIncidents,
    violent_crimes: violentCrimes,
    property_crimes: propertyCrimes,
    score,
    national_comparison: comparison,
    trend_5yr: 'stable',
    is_estimated: isEstimated,
  };
}
