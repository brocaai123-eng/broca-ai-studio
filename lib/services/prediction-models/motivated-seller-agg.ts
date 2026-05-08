import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface MotivatedSellerAggResult {
  model_key: 'motivated_seller_agg';
  headline: string;
  score: number;
  confidence_pct: number;
  direction: 'up' | 'down' | 'stable';
  payload: {
    totalProperties: number;
    highCount: number;
    moderateCount: number;
    lowCount: number;
    avgScore: number;
    pctDistressed: number;
    topSignals: Array<{ signal: string; count: number }>;
  };
  model_version: string;
}

export async function runMotivatedSellerAgg(zip: string): Promise<MotivatedSellerAggResult | null> {
  const { data: properties, error } = await supabase
    .from('properties')
    .select('motivated_seller_score, motivated_seller_label, motivated_seller_breakdown')
    .eq('zip', zip);

  if (error || !properties || properties.length === 0) return null;

  const total = properties.length;
  const scores = properties.map((p) => Number(p.motivated_seller_score) || 0);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / total);

  const highCount = properties.filter((p) => p.motivated_seller_label === 'HIGH').length;
  const moderateCount = properties.filter((p) => p.motivated_seller_label === 'MODERATE').length;
  const lowCount = properties.filter((p) => p.motivated_seller_label === 'LOW').length;
  const pctDistressed = Math.round((highCount / total) * 100);

  // Aggregate top signals across all properties
  const signalCounts: Record<string, number> = {};
  for (const p of properties) {
    const breakdown = p.motivated_seller_breakdown as Array<{ label: string; active: boolean }> | null;
    if (!breakdown) continue;
    for (const b of breakdown) {
      if (b.active) {
        signalCounts[b.label] = (signalCounts[b.label] || 0) + 1;
      }
    }
  }

  const topSignals = Object.entries(signalCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([signal, count]) => ({ signal, count }));

  const topSignalName = topSignals[0]?.signal ?? 'None';
  const score = Math.max(0, Math.min(100, avgScore));
  const confidence = Math.max(40, Math.min(90, 40 + Math.min(total, 100) * 0.5));

  const direction: 'up' | 'down' | 'stable' =
    pctDistressed > 15 ? 'up' : pctDistressed < 5 ? 'down' : 'stable';

  const headline = `${highCount} motivated sellers in ${zip} | Avg distress: ${avgScore} | Top signal: ${topSignalName}`;

  return {
    model_key: 'motivated_seller_agg',
    headline,
    score,
    confidence_pct: Math.round(confidence * 100) / 100,
    direction,
    payload: {
      totalProperties: total,
      highCount,
      moderateCount,
      lowCount,
      avgScore,
      pctDistressed,
      topSignals,
    },
    model_version: 'seller-agg-v1',
  };
}
