import type { PriceForecastResult } from './price-forecast';
import type { PopulationMigrationResult } from './population-migration';
import type { GridDemandResult } from './grid-demand';
import type { NeighborhoodTrajectoryResult } from './neighborhood-trajectory';
import type { MotivatedSellerAggResult } from './motivated-seller-agg';
import type { MarketVolatilityResult } from './market-volatility';

type Recommendation = 'BUY' | 'HOLD' | 'SELL';

export interface CrossIndustryResult {
  model_key: 'cross_industry';
  headline: string;
  score: number;
  confidence_pct: number;
  direction: 'up' | 'down' | 'stable';
  payload: {
    momentumScore: number;
    recommendation: Recommendation;
    topDrivers: Array<{ model: string; contribution: number; score: number; direction: string }>;
    modelCount: number;
  };
  model_version: string;
}

interface ModelInput {
  key: string;
  label: string;
  weight: number;
  score: number | null;
  direction: string | null;
}

export function runCrossIndustry(
  price: PriceForecastResult | null,
  population: PopulationMigrationResult | null,
  grid: GridDemandResult | null,
  neighborhood: NeighborhoodTrajectoryResult | null,
  seller: MotivatedSellerAggResult | null,
  volatility: MarketVolatilityResult | null,
): CrossIndustryResult | null {
  const models: ModelInput[] = [
    { key: 'price_forecast', label: 'Price Trend', weight: 0.25, score: price?.score ?? null, direction: price?.direction ?? null },
    { key: 'neighborhood_trajectory', label: 'Neighborhood', weight: 0.20, score: neighborhood?.score ?? null, direction: neighborhood?.direction ?? null },
    { key: 'population_migration', label: 'Population', weight: 0.15, score: population?.score ?? null, direction: population?.direction ?? null },
    { key: 'market_volatility', label: 'Volatility', weight: 0.15, score: volatility?.score ?? null, direction: volatility?.direction ?? null },
    { key: 'grid_demand', label: 'Grid Demand', weight: 0.10, score: grid?.score ?? null, direction: grid?.direction ?? null },
    { key: 'motivated_seller_agg', label: 'Seller Distress', weight: 0.15, score: seller?.score ?? null, direction: seller?.direction ?? null },
  ];

  const available = models.filter((m) => m.score !== null);
  if (available.length === 0) return null;

  // Re-normalize weights for available models
  const totalWeight = available.reduce((s, m) => s + m.weight, 0);
  let weightedSum = 0;
  let weightedConfidence = 0;

  const topDrivers: CrossIndustryResult['payload']['topDrivers'] = [];

  for (const m of available) {
    const normalizedWeight = m.weight / totalWeight;
    const contribution = (m.score! * normalizedWeight);
    weightedSum += contribution;
    topDrivers.push({
      model: m.label,
      contribution: Math.round(contribution * 100) / 100,
      score: m.score!,
      direction: m.direction ?? 'stable',
    });
  }

  // Get individual model confidences
  const confidences = [
    price?.confidence_pct,
    population?.confidence_pct,
    grid?.confidence_pct,
    neighborhood?.confidence_pct,
    seller?.confidence_pct,
    volatility?.confidence_pct,
  ].filter((c): c is number => c != null);

  weightedConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 50;

  // Boost confidence when more models contribute
  weightedConfidence = Math.min(90, weightedConfidence + available.length * 2);

  const momentumScore = Math.max(0, Math.min(100, Math.round(weightedSum)));

  topDrivers.sort((a, b) => b.contribution - a.contribution);

  const direction: 'up' | 'down' | 'stable' =
    momentumScore > 60 ? 'up' : momentumScore < 40 ? 'down' : 'stable';

  const recommendation: Recommendation =
    momentumScore >= 65 ? 'BUY' : momentumScore >= 40 ? 'HOLD' : 'SELL';

  const sentiment = momentumScore >= 65 ? 'Bullish' : momentumScore >= 40 ? 'Neutral' : 'Bearish';
  const topDriver = topDrivers[0];
  const headline = `Momentum: ${momentumScore} (${sentiment}) | Top driver: ${topDriver?.model ?? 'N/A'} | Recommendation: ${recommendation}`;

  return {
    model_key: 'cross_industry',
    headline,
    score: momentumScore,
    confidence_pct: Math.round(weightedConfidence * 100) / 100,
    direction,
    payload: {
      momentumScore,
      recommendation,
      topDrivers,
      modelCount: available.length,
    },
    model_version: 'cross-composite-v1',
  };
}
