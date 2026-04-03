// Market Intelligence Types

export interface MarketAnalysisRequest {
  query: string; // city name, zip code, or county
}

export interface RentCastData {
  medianPrice: number | null;
  averagePrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  medianPricePerSqFt: number | null;
  activeListings: number | null;
  newListings: number | null;
  monthlySoldCount: number | null;
  averageDaysOnMarket: number | null;
  medianDaysOnMarket: number | null;
  averageSquareFootage: number | null;
  history: RentCastHistoryEntry[];
}

export interface RentCastHistoryEntry {
  date: string;
  medianPrice: number | null;
  activeListings: number | null;
  averageDaysOnMarket: number | null;
  newListings: number | null;
}

export interface FREDData {
  currentMortgageRate: number | null;
  previousRate: number | null;
  rateChange: number | null;
  rateTrend: 'up' | 'down' | 'stable';
  history: FREDHistoryEntry[];
}

export interface FREDHistoryEntry {
  date: string;
  value: number;
}

export interface CensusData {
  medianIncome: number | null;
  population: number | null;
  locationName: string | null;
}

export interface BLSData {
  cpiCurrent: number | null;
  cpiPrevYear: number | null;
  inflationRate: number | null;
}

export interface ARIAScore {
  total: number; // 0-100
  breakdown: {
    priceTrend: { score: number; weight: number; raw: number | null; label: string };
    inventoryHealth: { score: number; weight: number; raw: number | null; label: string };
    marketVelocity: { score: number; weight: number; raw: number | null; label: string };
    affordability: { score: number; weight: number; raw: number | null; label: string };
    listingActivity: { score: number; weight: number; raw: number | null; label: string };
    rateImpact: { score: number; weight: number; raw: number | null; label: string };
  };
}

export interface MarketType {
  type: 'sellers' | 'buyers' | 'balanced';
  label: string;
  description: string;
}

export interface MarketAnalysisResult {
  location: string;
  zipCode: string;
  state: string | null;
  county: string | null;
  ariaScore: ARIAScore;
  marketType: MarketType;
  rentCast: RentCastData;
  fred: FREDData;
  census: CensusData;
  bls: BLSData;
  aiSummary: string;
  analyzedAt: string;
  dataSourceStatus: {
    rentCast: boolean;
    fred: boolean;
    census: boolean;
    bls: boolean;
  };
}

export interface SavedMarketAnalysis {
  id: string;
  broker_id: string;
  location: string;
  zip_code: string;
  state: string | null;
  county: string | null;
  aria_score: number;
  market_data: MarketAnalysisResult;
  ai_summary: string | null;
  market_type: string | null;
  created_at: string;
  updated_at: string;
}

// Months of supply thresholds
export const MARKET_THRESHOLDS = {
  SELLERS_MARKET: 4,   // < 4 months supply = seller's market
  BUYERS_MARKET: 6,    // > 6 months supply = buyer's market
  HOT_DOM: 21,         // < 21 days = hot market
  COLD_DOM: 90,        // > 90 days = cold market
  IDEAL_SUPPLY_LOW: 2,
  IDEAL_SUPPLY_HIGH: 4,
} as const;
