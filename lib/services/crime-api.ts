const FBI_API_KEY = process.env.FBI_CRIME_API_KEY || '';

export interface CrimeScore {
  zip: string;
  total_incidents: number;
  violent_crimes: number;
  property_crimes: number;
  score: number; // 0-100, higher = safer
  national_comparison: string;
  trend_5yr: 'improving' | 'worsening' | 'stable';
}

export interface CrimeBreakdown {
  category: string;
  count: number;
  per_capita: number;
  trend: 'up' | 'down' | 'flat';
}

// Socrata API — Miami-Dade, Broward, Palm Beach crime data
const SOCRATA_ENDPOINTS: Record<string, string> = {
  'miami-dade': 'https://opendata.miamidade.gov/resource/crimes.json',
  'broward': 'https://opendata.broward.org/resource/crimes.json',
  'palm-beach': 'https://data-pbcgov.opendata.arcgis.com/api/v2/datasets/crimes',
};

export async function getSocrataCrimeByZip(zip: string, county?: string): Promise<CrimeBreakdown[]> {
  try {
    const endpoint = county && SOCRATA_ENDPOINTS[county]
      ? SOCRATA_ENDPOINTS[county]
      : SOCRATA_ENDPOINTS['miami-dade'];

    const res = await fetch(
      `${endpoint}?$where=zip_code='${zip}'&$limit=500&$order=date_ocurred DESC`,
      { headers: { 'Accept': 'application/json' }, next: { revalidate: 86400 } }
    );

    if (!res.ok) {
      return getDefaultCrimeBreakdown();
    }

    const data = await res.json();
    const categories: Record<string, number> = {};

    for (const incident of data) {
      const cat = incident.offense_type || incident.crime_type || 'Other';
      categories[cat] = (categories[cat] || 0) + 1;
    }

    return Object.entries(categories).map(([category, count]) => ({
      category,
      count,
      per_capita: 0,
      trend: 'flat' as const,
    }));
  } catch {
    return getDefaultCrimeBreakdown();
  }
}

// FBI Crime Data API — national benchmarks
export async function getFBICrimeData(stateAbbr: string = 'FL'): Promise<{
  violent_rate: number;
  property_rate: number;
  national_avg_violent: number;
  national_avg_property: number;
}> {
  try {
    const res = await fetch(
      `https://api.usa.gov/crime/fbi/sapi/api/estimates/states/${stateAbbr}/2020/2023?API_KEY=${FBI_API_KEY}`,
      { next: { revalidate: 604800 } } // cache 1 week
    );

    if (!res.ok) {
      return getDefaultFBIData();
    }

    const data = await res.json();
    const latest = data?.results?.[0];

    if (!latest) return getDefaultFBIData();

    return {
      violent_rate: latest.violent_crime || 0,
      property_rate: latest.property_crime || 0,
      national_avg_violent: 380.7,
      national_avg_property: 1954.4,
    };
  } catch {
    return getDefaultFBIData();
  }
}

export async function calculateCrimeScore(zip: string): Promise<CrimeScore> {
  const [breakdown, fbiData] = await Promise.all([
    getSocrataCrimeByZip(zip),
    getFBICrimeData('FL'),
  ]);

  const totalIncidents = breakdown.reduce((sum, b) => sum + b.count, 0);
  const violentCrimes = breakdown
    .filter(b => ['assault', 'robbery', 'homicide', 'rape'].some(v => b.category.toLowerCase().includes(v)))
    .reduce((sum, b) => sum + b.count, 0);
  const propertyCrimes = totalIncidents - violentCrimes;

  // Score: 100 = safest, 0 = least safe
  const score = Math.max(0, Math.min(100, 100 - Math.round((totalIncidents / 50) * 10)));

  const comparison = score >= 70 ? 'Below national average' :
    score >= 40 ? 'Near national average' : 'Above national average';

  return {
    zip,
    total_incidents: totalIncidents,
    violent_crimes: violentCrimes,
    property_crimes: propertyCrimes,
    score,
    national_comparison: comparison,
    trend_5yr: 'stable',
  };
}

function getDefaultCrimeBreakdown(): CrimeBreakdown[] {
  return [
    { category: 'Theft', count: 0, per_capita: 0, trend: 'flat' },
    { category: 'Burglary', count: 0, per_capita: 0, trend: 'flat' },
    { category: 'Assault', count: 0, per_capita: 0, trend: 'flat' },
  ];
}

function getDefaultFBIData() {
  return {
    violent_rate: 0,
    property_rate: 0,
    national_avg_violent: 380.7,
    national_avg_property: 1954.4,
  };
}
