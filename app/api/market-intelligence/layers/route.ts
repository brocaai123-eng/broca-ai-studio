import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/utils/with-timeout';
import { calculateCrimeScore, getSocrataCrimeByZip, getFBICrimeData } from '@/lib/services/crime-api';
import { getGridCapacityScore } from '@/lib/services/eia-api';
import { getNearestSubstations } from '@/lib/services/hifld-api';
import { getTrafficCountByZip, getTrafficScore, isCommercialViable } from '@/lib/services/dot-traffic';
import { getZipCodeNews } from '@/lib/services/news-rss';

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

const CENSUS_API_KEY = process.env.CENSUS_API_KEY || '';

async function zipCentroid(zip: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data?.places?.[0];
    const lat = Number(place?.latitude);
    const lng = Number(place?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

async function fetchCensusZcta(zip: string): Promise<{
  population: number | null;
  median_income: number | null;
  owner: number | null;
  renter: number | null;
} | null> {
  if (!CENSUS_API_KEY) return null;
  try {
    const vars = ['B01003_001E', 'B19013_001E', 'B25003_002E', 'B25003_003E'].join(',');
    const res = await fetch(
      `https://api.census.gov/data/2022/acs/acs5?get=${vars}&for=zip%20code%20tabulation%20area:${zip}&key=${CENSUS_API_KEY}`,
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length < 2) return null;
    const r = rows[1];
    const pop = Number(r[0]);
    const income = Number(r[1]);
    const owner = Number(r[2]);
    const renter = Number(r[3]);
    return {
      population: Number.isFinite(pop) ? pop : null,
      median_income: Number.isFinite(income) ? income : null,
      owner: Number.isFinite(owner) ? owner : null,
      renter: Number.isFinite(renter) ? renter : null,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const zip = String(searchParams.get('zip') || '').trim();
    if (!zip || !/^\d{5}$/.test(zip)) return NextResponse.json({ error: 'zip is required (5 digits)' }, { status: 400 });

    const { data, error } = await withTimeout(
      supabaseAdmin
        .from('intelligence_layers')
        .select('*')
        .eq('zip', zip)
        .order('as_of_date', { ascending: false })
        .limit(20),
      12000,
      'Layers query',
    );
    if (error) throw error;

    // Return the latest layer per layer_key
    const latestByKey = new Map<string, any>();
    for (const row of data ?? []) {
      if (!latestByKey.has(row.layer_key)) latestByKey.set(row.layer_key, row);
    }

    // Live fallback: if we have no cached layers yet, compute and upsert today’s snapshot
    if (latestByKey.size === 0) {
      const asOf = new Date().toISOString().split('T')[0];

      const [crimeScore, crimeBreakdown, fbi, grid, centroid, news, census, trafficCounts] = await Promise.all([
        withTimeout(calculateCrimeScore(zip), 15000, 'Crime score'),
        withTimeout(getSocrataCrimeByZip(zip), 15000, 'Crime breakdown'),
        withTimeout(getFBICrimeData('FL'), 15000, 'FBI benchmark'),
        withTimeout(getGridCapacityScore(zip), 15000, 'Grid capacity'),
        zipCentroid(zip),
        withTimeout(getZipCodeNews(zip), 15000, 'News RSS'),
        fetchCensusZcta(zip),
        withTimeout(getTrafficCountByZip(zip), 8000, 'Traffic'),
      ]);

      const substations = centroid
        ? await withTimeout(getNearestSubstations(centroid.lat, centroid.lng, 10), 15000, 'HIFLD substations')
        : [];

      const trafficTop = (trafficCounts || []).slice(0, 3);
      const trafficScore = trafficTop.length ? getTrafficScore(trafficTop[0].daily_count) : null;
      const retailSignal = trafficTop.length ? isCommercialViable(trafficTop[0].daily_count) : null;

      const ownerRenterRatio =
        census?.owner != null && census?.renter != null && census.renter > 0
          ? Math.round((census.owner / census.renter) * 100) / 100
          : null;

      const layerRows = [
        {
          zip,
          layer_key: 'crime',
          as_of_date: asOf,
          headline: `Incidents (sample): ${crimeScore.total_incidents} • Safety score ${crimeScore.score}/100`,
          badge: crimeScore.score <= 40 ? 'High risk' : crimeScore.score <= 70 ? 'Watch' : 'Stable',
          severity: crimeScore.score <= 40 ? 'high' : crimeScore.score <= 70 ? 'medium' : 'low',
          payload: {
            incidents_sample: crimeScore.total_incidents,
            violent_crimes_sample: crimeScore.violent_crimes,
            property_crimes_sample: crimeScore.property_crimes,
            safety_score: crimeScore.score,
            national_comparison: crimeScore.national_comparison,
            fbi_benchmark: fbi,
            breakdown: crimeBreakdown,
          },
        },
        {
          zip,
          layer_key: 'grid',
          as_of_date: asOf,
          headline: `Capacity ${Math.round(grid.capacity_pct)}% • Utility ${grid.utility_name}`,
          badge: grid.ev_charging_opportunity ? 'EV signal' : null,
          severity: grid.capacity_pct >= 80 ? 'high' : grid.capacity_pct >= 65 ? 'medium' : 'low',
          payload: {
            capacity_pct: grid.capacity_pct,
            grid_score: grid.grid_score,
            utility_name: grid.utility_name,
            nearest_substations: substations.slice(0, 3),
          },
        },
        {
          zip,
          layer_key: 'traffic',
          as_of_date: asOf,
          headline: trafficTop.length ? `${trafficTop[0].road_name}: ${trafficTop[0].daily_count.toLocaleString()}/day` : 'No traffic counts available',
          badge: retailSignal ? 'Retail opportunity' : null,
          severity: trafficScore != null ? (trafficScore >= 80 ? 'high' : trafficScore >= 55 ? 'medium' : 'low') : 'low',
          payload: {
            top_corridors: trafficTop,
            traffic_score: trafficScore,
            retail_opportunity: retailSignal,
          },
        },
        {
          zip,
          layer_key: 'news',
          as_of_date: asOf,
          headline: news?.[0]?.title ? `Latest: ${news[0].title}` : 'No recent news found',
          badge: null,
          severity: 'low',
          payload: {
            last_7_days: (news || []).slice(0, 10).map((a) => ({
              date: a.pubDate,
              headline: a.title,
              url: a.link,
              source: a.source,
              signal: null,
              confidence_pct: null,
            })),
          },
        },
        {
          zip,
          layer_key: 'people',
          as_of_date: asOf,
          headline: census?.population ? `Population ${census.population.toLocaleString()} • Median income ${census.median_income ? `$${census.median_income.toLocaleString()}` : '—'}` : 'Demographics not available',
          badge: ownerRenterRatio != null ? `Owner/Renter ${ownerRenterRatio}` : null,
          severity: 'low',
          payload: {
            population: census?.population ?? null,
            median_income: census?.median_income ?? null,
            owner_count: census?.owner ?? null,
            renter_count: census?.renter ?? null,
            owner_renter_ratio: ownerRenterRatio,
          },
        },
      ];

      const { data: saved, error: upErr } = await withTimeout(
        supabaseAdmin
          .from('intelligence_layers')
          .upsert(layerRows, { onConflict: 'zip,layer_key,as_of_date' })
          .select('*'),
        20000,
        'Layers upsert',
      );
      if (upErr) throw upErr;

      return NextResponse.json({ zip, layers: saved ?? layerRows, live_fallback: true });
    }

    return NextResponse.json({
      zip,
      layers: Array.from(latestByKey.values()),
    });
  } catch (e) {
    console.error('[market-intelligence/layers] error', e);
    return NextResponse.json({ error: 'Failed to load intelligence layers' }, { status: 500 });
  }
}

