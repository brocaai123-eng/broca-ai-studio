import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface GridDemandResult {
  model_key: 'grid_demand';
  headline: string;
  score: number;
  confidence_pct: number;
  direction: 'up' | 'down' | 'stable';
  payload: {
    currentConsumption: number | null;
    pricePerKwh: number | null;
    demandGrowthPct: number;
    capacityUtilPct: number;
    riskLevel: 'Low' | 'Medium' | 'High';
    newListingGrowth: number;
    factors: Array<{ name: string; value: number | string; signal: string }>;
  };
  model_version: string;
}

export async function runGridDemand(
  zip: string,
  populationScore?: number,
): Promise<GridDemandResult | null> {
  const [energyData, snapshots] = await Promise.all([
    supabase
      .from('energy_data')
      .select('consumption_mwh, price_cents_kwh, generation_revenue, collected_at')
      .eq('state', 'FL')
      .order('collected_at', { ascending: false })
      .limit(12),
    supabase
      .from('market_snapshots')
      .select('new_listings')
      .eq('zip', zip)
      .order('snapshot_date', { ascending: true })
      .limit(60),
  ]);

  const energy = energyData.data ?? [];
  const listings = (snapshots.data ?? []).map((s) => Number(s.new_listings) || 0);

  if (energy.length === 0) return null;

  const latest = energy[0];
  const currentConsumption = Number(latest.consumption_mwh) || null;
  const pricePerKwh = Number(latest.price_cents_kwh) || null;

  // Energy consumption trend
  const consumptionValues = energy.map((e) => Number(e.consumption_mwh) || 0).filter((v) => v > 0).reverse();
  let energyGrowth = 0;
  if (consumptionValues.length >= 2) {
    const recent = consumptionValues.slice(-Math.ceil(consumptionValues.length / 2));
    const older = consumptionValues.slice(0, Math.ceil(consumptionValues.length / 2));
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    energyGrowth = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
  }

  // New listing growth as proxy for development
  let listingGrowth = 0;
  if (listings.length >= 4) {
    const recentL = listings.slice(-Math.ceil(listings.length / 2));
    const olderL = listings.slice(0, Math.ceil(listings.length / 2));
    const rAvg = recentL.reduce((a, b) => a + b, 0) / recentL.length;
    const oAvg = olderL.reduce((a, b) => a + b, 0) / olderL.length;
    listingGrowth = oAvg > 0 ? ((rAvg - oAvg) / oAvg) * 100 : 0;
  }

  // Population growth pressure on grid
  const popPressure = populationScore != null ? (populationScore - 50) * 0.05 : 0;

  const demandGrowthPct = energyGrowth * 0.5 + listingGrowth * 0.2 + popPressure * 30;

  // Capacity utilization heuristic: base 70% + price pressure
  const priceStress = pricePerKwh ? Math.max(0, (pricePerKwh - 10) * 2) : 0;
  const capacityUtilPct = Math.max(40, Math.min(98, 70 + priceStress + demandGrowthPct * 0.5));

  const riskLevel: 'Low' | 'Medium' | 'High' =
    capacityUtilPct > 85 ? 'High' : capacityUtilPct > 70 ? 'Medium' : 'Low';

  const factors: GridDemandResult['payload']['factors'] = [
    { name: 'Energy Consumption Growth', value: `${energyGrowth.toFixed(1)}%`, signal: energyGrowth > 2 ? 'up' : 'stable' },
    { name: 'New Development Activity', value: `${listingGrowth.toFixed(1)}%`, signal: listingGrowth > 5 ? 'up' : 'stable' },
    { name: 'Price per kWh', value: `${(pricePerKwh ?? 0).toFixed(1)}¢`, signal: (pricePerKwh ?? 0) > 12 ? 'up' : 'stable' },
    { name: 'Population Pressure', value: populationScore?.toString() ?? 'N/A', signal: popPressure > 0 ? 'up' : 'stable' },
  ];

  const score = Math.max(0, Math.min(100, Math.round(
    50 + demandGrowthPct * 2 + (capacityUtilPct - 70) * 0.5,
  )));

  const confidence = Math.max(35, Math.min(80,
    40 + energy.length * 3 + (listings.length > 10 ? 10 : 0),
  ));

  const direction: 'up' | 'down' | 'stable' =
    demandGrowthPct > 2 ? 'up' : demandGrowthPct < -2 ? 'down' : 'stable';

  const headline = `Grid at ${Math.round(capacityUtilPct)}% capacity | ${demandGrowthPct >= 0 ? '+' : ''}${demandGrowthPct.toFixed(1)}% demand projected | Risk: ${riskLevel}`;

  return {
    model_key: 'grid_demand',
    headline,
    score,
    confidence_pct: Math.round(confidence * 100) / 100,
    direction,
    payload: {
      currentConsumption,
      pricePerKwh,
      demandGrowthPct: Math.round(demandGrowthPct * 100) / 100,
      capacityUtilPct: Math.round(capacityUtilPct * 100) / 100,
      riskLevel,
      newListingGrowth: Math.round(listingGrowth * 100) / 100,
      factors,
    },
    model_version: 'grid-composite-v1',
  };
}
