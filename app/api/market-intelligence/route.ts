import { NextRequest, NextResponse } from 'next/server';
import type {
  RentCastData,
  RentCastHistoryEntry,
  FREDData,
  FREDHistoryEntry,
  CensusData,
  BLSData,
  ARIAScore,
  MarketType,
  MarketAnalysisResult,
} from '@/lib/types/market-intelligence';

const FRED_API_KEY = process.env.FRED_API_KEY!;
const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY!;
const CENSUS_API_KEY = process.env.CENSUS_API_KEY!;
const BLS_API_KEY = process.env.BLS_API_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

// ─── Zip Code to City Name ─────────────────────────────────────────────
async function getZipInfo(zipCode: string): Promise<{ city: string; state: string } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
    if (res.ok) {
      const data = await res.json();
      const place = data?.places?.[0];
      if (place) {
        return { city: place['place name'], state: place['state abbreviation'] };
      }
    }
  } catch { /* fallback */ }
  return null;
}

// ─── Zip Code Resolution ───────────────────────────────────────────────
async function resolveZipCode(query: string): Promise<{ zipCode: string; location: string; state: string | null }> {
  const cleaned = query.trim();
  
  // If it's already a 5-digit zip code
  if (/^\d{5}$/.test(cleaned)) {
    const info = await getZipInfo(cleaned);
    if (info) {
      return { zipCode: cleaned, location: `${info.city}, ${info.state}`, state: info.state };
    }
    return { zipCode: cleaned, location: cleaned, state: null };
  }

  // City/county name — use Census geocoder
  try {
    const res = await fetch(
      `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(cleaned)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      const match = data?.result?.addressMatches?.[0];
      if (match) {
        const zip = match.addressComponents?.zip || '';
        const state = match.addressComponents?.state || null;
        const city = match.addressComponents?.city || cleaned;
        return { zipCode: zip, location: state ? `${city}, ${state}` : city, state };
      }
    }
  } catch { /* fallback */ }

  // Fallback: try as zip
  if (/^\d{3,5}$/.test(cleaned)) {
    const padded = cleaned.padStart(5, '0');
    const info = await getZipInfo(padded);
    if (info) {
      return { zipCode: padded, location: `${info.city}, ${info.state}`, state: info.state };
    }
    return { zipCode: padded, location: padded, state: null };
  }

  throw new Error(`Could not resolve location: "${cleaned}". Please enter a valid US city, zip code, or county.`);
}

// ─── RentCast API ──────────────────────────────────────────────────────
async function fetchRentCast(zipCode: string): Promise<RentCastData> {
  const empty: RentCastData = {
    medianPrice: null, averagePrice: null, minPrice: null, maxPrice: null,
    medianPricePerSqFt: null, activeListings: null, newListings: null,
    averageDaysOnMarket: null, medianDaysOnMarket: null, averageSquareFootage: null,
    history: [],
  };

  try {
    const res = await fetch(
      `https://api.rentcast.io/v1/markets?zipCode=${zipCode}&dataType=Sale&historyRange=12`,
      { headers: { 'X-Api-Key': RENTCAST_API_KEY, Accept: 'application/json' } }
    );

    if (!res.ok) {
      console.error('RentCast error:', res.status, await res.text());
      return empty;
    }

    const data = await res.json();
    const sale = data?.saleData;
    if (!sale) return empty;

    // Extract history — RentCast returns history as an object keyed by date (e.g. "2025-05")
    const historyObj = sale.history || {};
    const history: RentCastHistoryEntry[] = Object.entries(historyObj)
      .map(([key, val]) => {
        const h = val as Record<string, unknown>;
        return {
          date: (h.date as string) || `${key}-01`,
          medianPrice: (h.medianPrice as number) ?? null,
          activeListings: (h.totalListings as number) ?? null,
          averageDaysOnMarket: (h.averageDaysOnMarket as number) ?? null,
          newListings: (h.newListings as number) ?? null,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Sum up newListings from latest month if top-level is 0
    const latestMonth = history.length > 0 ? history[history.length - 1] : null;
    const topNewListings = sale.newListings || latestMonth?.newListings || null;

    return {
      medianPrice: sale.medianPrice ?? null,
      averagePrice: sale.averagePrice ?? null,
      minPrice: sale.minPrice ?? null,
      maxPrice: sale.maxPrice ?? null,
      medianPricePerSqFt: sale.medianPricePerSquareFoot ?? null,
      activeListings: sale.totalListings ?? null,
      newListings: topNewListings,
      averageDaysOnMarket: sale.averageDaysOnMarket ?? null,
      medianDaysOnMarket: sale.medianDaysOnMarket ?? null,
      averageSquareFootage: sale.averageSquareFootage ?? null,
      history,
    };
  } catch (err) {
    console.error('RentCast fetch error:', err);
    return empty;
  }
}

// ─── FRED API (Mortgage Rates) ─────────────────────────────────────────
async function fetchFRED(): Promise<FREDData> {
  const empty: FREDData = {
    currentMortgageRate: null, previousRate: null, rateChange: null,
    rateTrend: 'stable', history: [],
  };

  try {
    const res = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=52`
    );

    if (!res.ok) {
      console.error('FRED error:', res.status);
      return empty;
    }

    const data = await res.json();
    const observations = data?.observations || [];

    const validObs = observations
      .filter((o: { value: string }) => o.value !== '.')
      .map((o: { date: string; value: string }) => ({
        date: o.date,
        value: parseFloat(o.value),
      }));

    if (validObs.length === 0) return empty;

    const current = validObs[0].value;
    const previous = validObs.length > 1 ? validObs[1].value : null;
    const change = previous ? +(current - previous).toFixed(2) : null;

    const history: FREDHistoryEntry[] = validObs.slice(0, 26).reverse();

    return {
      currentMortgageRate: current,
      previousRate: previous,
      rateChange: change,
      rateTrend: change === null ? 'stable' : change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'stable',
      history,
    };
  } catch (err) {
    console.error('FRED fetch error:', err);
    return empty;
  }
}

// ─── Census API ────────────────────────────────────────────────────────
async function fetchCensus(zipCode: string): Promise<CensusData> {
  const empty: CensusData = { medianIncome: null, population: null, locationName: null };

  try {
    const res = await fetch(
      `https://api.census.gov/data/2022/acs/acs5?get=B19013_001E,B01003_001E,NAME&for=zip%20code%20tabulation%20area:${zipCode}&key=${CENSUS_API_KEY}`
    );

    if (!res.ok) {
      console.error('Census error:', res.status);
      return empty;
    }

    const data = await res.json();
    if (!data?.[1]) return empty;

    const row = data[1];
    return {
      medianIncome: row[0] ? parseInt(row[0]) : null,
      population: row[1] ? parseInt(row[1]) : null,
      locationName: row[2] ? row[2].replace(/^ZCTA5\s*/, '') : null,
    };
  } catch (err) {
    console.error('Census fetch error:', err);
    return empty;
  }
}

// ─── BLS API (CPI Inflation) ──────────────────────────────────────────
// BLS regional CPI series — returns different inflation per region
const BLS_REGION_MAP: Record<string, string> = {
  // Northeast → CUUR0100SA0
  CT: 'CUUR0100SA0', ME: 'CUUR0100SA0', MA: 'CUUR0100SA0', NH: 'CUUR0100SA0',
  NJ: 'CUUR0100SA0', NY: 'CUUR0100SA0', PA: 'CUUR0100SA0', RI: 'CUUR0100SA0', VT: 'CUUR0100SA0',
  // Midwest → CUUR0200SA0
  IL: 'CUUR0200SA0', IN: 'CUUR0200SA0', IA: 'CUUR0200SA0', KS: 'CUUR0200SA0',
  MI: 'CUUR0200SA0', MN: 'CUUR0200SA0', MO: 'CUUR0200SA0', NE: 'CUUR0200SA0',
  ND: 'CUUR0200SA0', OH: 'CUUR0200SA0', SD: 'CUUR0200SA0', WI: 'CUUR0200SA0',
  // South → CUUR0300SA0
  AL: 'CUUR0300SA0', AR: 'CUUR0300SA0', DE: 'CUUR0300SA0', DC: 'CUUR0300SA0',
  FL: 'CUUR0300SA0', GA: 'CUUR0300SA0', KY: 'CUUR0300SA0', LA: 'CUUR0300SA0',
  MD: 'CUUR0300SA0', MS: 'CUUR0300SA0', NC: 'CUUR0300SA0', OK: 'CUUR0300SA0',
  SC: 'CUUR0300SA0', TN: 'CUUR0300SA0', TX: 'CUUR0300SA0', VA: 'CUUR0300SA0', WV: 'CUUR0300SA0',
  // West → CUUR0400SA0
  AK: 'CUUR0400SA0', AZ: 'CUUR0400SA0', CA: 'CUUR0400SA0', CO: 'CUUR0400SA0',
  HI: 'CUUR0400SA0', ID: 'CUUR0400SA0', MT: 'CUUR0400SA0', NV: 'CUUR0400SA0',
  NM: 'CUUR0400SA0', OR: 'CUUR0400SA0', UT: 'CUUR0400SA0', WA: 'CUUR0400SA0', WY: 'CUUR0400SA0',
};

async function fetchBLS(state: string | null): Promise<BLSData> {
  const empty: BLSData = { cpiCurrent: null, cpiPrevYear: null, inflationRate: null };

  // Pick regional CPI series based on state; fall back to national
  const seriesId = (state && BLS_REGION_MAP[state.toUpperCase()]) || 'CUUR0000SA0';

  try {
    const currentYear = new Date().getFullYear();
    const res = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seriesid: [seriesId],
        startyear: String(currentYear - 2),
        endyear: String(currentYear),
        registrationkey: BLS_API_KEY,
      }),
    });

    if (!res.ok) {
      console.error('BLS error:', res.status);
      return empty;
    }

    const data = await res.json();
    const series = data?.Results?.series?.[0]?.data || [];

    // Get latest and year-ago values
    const validEntries = series.filter((e: { value: string }) => e.value !== '-');
    if (validEntries.length < 2) return empty;

    const latest = parseFloat(validEntries[0].value);
    // Find same month from previous year
    const latestMonth = validEntries[0].period;
    const yearAgo = validEntries.find(
      (e: { year: string; period: string }) => e.period === latestMonth && e.year === String(currentYear - 1)
    );
    const prevYearValue = yearAgo ? parseFloat(yearAgo.value) : parseFloat(validEntries[validEntries.length - 1].value);
    const inflationRate = prevYearValue ? +((latest - prevYearValue) / prevYearValue * 100).toFixed(1) : null;

    return {
      cpiCurrent: latest,
      cpiPrevYear: prevYearValue,
      inflationRate,
    };
  } catch (err) {
    console.error('BLS fetch error:', err);
    return empty;
  }
}

// ─── ARIA Market Score Calculator ──────────────────────────────────────
function calculateARIAScore(
  rentCast: RentCastData,
  fred: FREDData,
  census: CensusData,
  bls: BLSData,
): ARIAScore {
  const hasRentCast = rentCast.medianPrice !== null;

  // 1. Price Trend (20%) — Based on price history change
  let priceTrendScore = 50;
  let priceTrendRaw: number | null = null;
  if (rentCast.history.length >= 2) {
    const recent = rentCast.history[rentCast.history.length - 1]?.medianPrice;
    const older = rentCast.history[0]?.medianPrice;
    if (recent && older && older > 0) {
      const change = ((recent - older) / older) * 100;
      priceTrendRaw = +change.toFixed(1);
      if (change >= 2 && change <= 8) priceTrendScore = 80 + (change - 2) * 2;
      else if (change > 8) priceTrendScore = Math.max(50, 90 - (change - 8) * 3);
      else if (change >= 0) priceTrendScore = 50 + change * 15;
      else priceTrendScore = Math.max(10, 50 + change * 5);
      priceTrendScore = Math.min(100, Math.max(0, priceTrendScore));
    }
  } else if (!hasRentCast && bls.inflationRate !== null) {
    // Without RentCast: use inflation as proxy for price pressure
    priceTrendRaw = bls.inflationRate;
    if (bls.inflationRate <= 2) priceTrendScore = 75;
    else if (bls.inflationRate <= 3) priceTrendScore = 65;
    else if (bls.inflationRate <= 4) priceTrendScore = 50;
    else if (bls.inflationRate <= 6) priceTrendScore = 35;
    else priceTrendScore = 20;
  }

  // 2. Inventory Health (20%) — Months of supply
  let inventoryScore = 50;
  let monthsOfSupply: number | null = null;
  if (rentCast.activeListings && rentCast.newListings && rentCast.newListings > 0) {
    monthsOfSupply = +(rentCast.activeListings / rentCast.newListings).toFixed(1);
    if (monthsOfSupply >= 2 && monthsOfSupply <= 4) inventoryScore = 85 + (4 - monthsOfSupply) * 5;
    else if (monthsOfSupply < 2) inventoryScore = 60 + monthsOfSupply * 10;
    else if (monthsOfSupply <= 6) inventoryScore = 85 - (monthsOfSupply - 4) * 10;
    else inventoryScore = Math.max(10, 65 - (monthsOfSupply - 6) * 8);
    inventoryScore = Math.min(100, Math.max(0, inventoryScore));
  } else if (!hasRentCast && census.population !== null) {
    // Without RentCast: use population as proxy (larger markets = more liquid)
    if (census.population > 100000) inventoryScore = 75;
    else if (census.population > 50000) inventoryScore = 65;
    else if (census.population > 20000) inventoryScore = 55;
    else if (census.population > 10000) inventoryScore = 45;
    else inventoryScore = 35;
  }

  // 3. Market Velocity (15%) — Days on market
  let velocityScore = 50;
  const dom = rentCast.averageDaysOnMarket;
  if (dom !== null) {
    if (dom <= 14) velocityScore = 95;
    else if (dom <= 21) velocityScore = 85;
    else if (dom <= 30) velocityScore = 75;
    else if (dom <= 45) velocityScore = 65;
    else if (dom <= 60) velocityScore = 50;
    else if (dom <= 90) velocityScore = 35;
    else velocityScore = 20;
  } else if (!hasRentCast && fred.currentMortgageRate !== null) {
    // Without RentCast: lower rates = faster sales velocity
    const rate = fred.currentMortgageRate;
    if (rate <= 5) velocityScore = 80;
    else if (rate <= 6) velocityScore = 65;
    else if (rate <= 6.5) velocityScore = 55;
    else if (rate <= 7) velocityScore = 40;
    else velocityScore = 30;
  }

  // 4. Affordability (15%) — Price to income ratio
  let affordabilityScore = 50;
  let priceToIncome: number | null = null;
  if (rentCast.medianPrice && census.medianIncome && census.medianIncome > 0) {
    priceToIncome = +(rentCast.medianPrice / census.medianIncome).toFixed(1);
    if (priceToIncome <= 3) affordabilityScore = 95;
    else if (priceToIncome <= 4) affordabilityScore = 85;
    else if (priceToIncome <= 5) affordabilityScore = 70;
    else if (priceToIncome <= 6) affordabilityScore = 55;
    else if (priceToIncome <= 8) affordabilityScore = 35;
    else affordabilityScore = 15;
  } else if (!hasRentCast && census.medianIncome !== null) {
    // Without RentCast: use income vs national median ($75K) as proxy
    const incomeRatio = census.medianIncome / 75000;
    priceToIncome = null;
    if (incomeRatio >= 2.0) affordabilityScore = 85;      // Very affluent area
    else if (incomeRatio >= 1.5) affordabilityScore = 75;  // Above average
    else if (incomeRatio >= 1.0) affordabilityScore = 60;  // Average
    else if (incomeRatio >= 0.7) affordabilityScore = 45;  // Below average
    else affordabilityScore = 30;                           // Low income area
  }

  // 5. Listing Activity (15%) — New listings trend
  let activityScore = 50;
  let activityRaw: number | null = null;
  if (rentCast.newListings !== null) {
    activityRaw = rentCast.newListings;
    if (rentCast.newListings > 100) activityScore = 90;
    else if (rentCast.newListings > 50) activityScore = 75;
    else if (rentCast.newListings > 20) activityScore = 60;
    else if (rentCast.newListings > 10) activityScore = 45;
    else activityScore = 30;
  } else if (!hasRentCast && census.population !== null && census.medianIncome !== null) {
    // Without RentCast: estimate from economic indicators
    const economicStrength = (census.medianIncome / 75000) * 50 + (Math.min(census.population, 200000) / 200000) * 50;
    activityScore = Math.min(80, Math.max(25, Math.round(economicStrength)));
  }

  // 6. Rate Impact (15%) — Mortgage rate relative to historical average (~6.5%)
  let rateScore = 50;
  const rate = fred.currentMortgageRate;
  if (rate !== null) {
    if (rate <= 5) rateScore = 95;
    else if (rate <= 5.5) rateScore = 85;
    else if (rate <= 6) rateScore = 75;
    else if (rate <= 6.5) rateScore = 65;
    else if (rate <= 7) rateScore = 50;
    else if (rate <= 7.5) rateScore = 35;
    else rateScore = 20;
  }

  const weights = {
    priceTrend: 0.20,
    inventoryHealth: 0.20,
    marketVelocity: 0.15,
    affordability: 0.15,
    listingActivity: 0.15,
    rateImpact: 0.15,
  };

  const total = Math.round(
    priceTrendScore * weights.priceTrend +
    inventoryScore * weights.inventoryHealth +
    velocityScore * weights.marketVelocity +
    affordabilityScore * weights.affordability +
    activityScore * weights.listingActivity +
    rateScore * weights.rateImpact
  );

  return {
    total: Math.min(100, Math.max(0, total)),
    breakdown: {
      priceTrend: { score: Math.round(priceTrendScore), weight: 20, raw: priceTrendRaw, label: 'Price Trend' },
      inventoryHealth: { score: Math.round(inventoryScore), weight: 20, raw: monthsOfSupply, label: 'Inventory Health' },
      marketVelocity: { score: Math.round(velocityScore), weight: 15, raw: dom, label: 'Market Velocity' },
      affordability: { score: Math.round(affordabilityScore), weight: 15, raw: priceToIncome, label: 'Affordability' },
      listingActivity: { score: Math.round(activityScore), weight: 15, raw: activityRaw, label: 'Listing Activity' },
      rateImpact: { score: Math.round(rateScore), weight: 15, raw: rate, label: 'Rate Impact' },
    },
  };
}

// ─── Market Type ───────────────────────────────────────────────────────
function determineMarketType(rentCast: RentCastData, fred: FREDData, census: CensusData): MarketType {
  let monthsOfSupply: number | null = null;
  if (rentCast.activeListings && rentCast.newListings && rentCast.newListings > 0) {
    monthsOfSupply = rentCast.activeListings / rentCast.newListings;
  }

  const dom = rentCast.averageDaysOnMarket;

  // Composite signals
  let sellerSignals = 0;
  let buyerSignals = 0;

  if (monthsOfSupply !== null) {
    if (monthsOfSupply < 4) sellerSignals += 2;
    else if (monthsOfSupply > 6) buyerSignals += 2;
  }

  if (dom !== null) {
    if (dom < 30) sellerSignals += 1;
    else if (dom > 60) buyerSignals += 1;
  }

  // Without RentCast: use rate + income signals
  if (rentCast.medianPrice === null) {
    // High rates = buyer leverage
    if (fred.currentMortgageRate !== null) {
      if (fred.currentMortgageRate > 7) buyerSignals += 1;
      else if (fred.currentMortgageRate < 5.5) sellerSignals += 1;
    }
    // Very high income area = likely competitive
    if (census.medianIncome !== null) {
      if (census.medianIncome > 120000) sellerSignals += 1;
      else if (census.medianIncome < 50000) buyerSignals += 1;
    }
  }

  if (sellerSignals > buyerSignals) {
    return { type: 'sellers', label: "Seller's", description: 'Low inventory and high demand favor sellers' };
  } else if (buyerSignals > sellerSignals) {
    return { type: 'buyers', label: "Buyer's", description: 'Market conditions give buyers more negotiating power' };
  }
  return { type: 'balanced', label: 'Balanced', description: 'Market conditions favor neither buyers nor sellers strongly' };
}

// ─── Claude AI Summary ─────────────────────────────────────────────────
async function generateAISummary(
  location: string,
  rentCast: RentCastData,
  fred: FREDData,
  census: CensusData,
  bls: BLSData,
  ariaScore: ARIAScore,
  marketType: MarketType,
): Promise<string> {
  try {
    const dataContext = `
Location: ${location}
ARIA Market Score: ${ariaScore.total}/100

Key Metrics:
- Median Home Price: ${rentCast.medianPrice ? `$${rentCast.medianPrice.toLocaleString()}` : 'N/A'}
- Active Listings: ${rentCast.activeListings ?? 'N/A'}
- Avg Days on Market: ${rentCast.averageDaysOnMarket ?? 'N/A'}
- New Listings: ${rentCast.newListings ?? 'N/A'}
- Months of Supply: ${rentCast.activeListings && rentCast.newListings ? (rentCast.activeListings / rentCast.newListings).toFixed(1) : 'N/A'}
- Current 30yr Mortgage Rate: ${fred.currentMortgageRate ? `${fred.currentMortgageRate}%` : 'N/A'}
- Rate Trend: ${fred.rateTrend}
- Median Household Income: ${census.medianIncome ? `$${census.medianIncome.toLocaleString()}` : 'N/A'}
- Population: ${census.population ? census.population.toLocaleString() : 'N/A'}
- Inflation Rate: ${bls.inflationRate ? `${bls.inflationRate}%` : 'N/A'}
- Market Type: ${marketType.label}
- Price-to-Income Ratio: ${rentCast.medianPrice && census.medianIncome ? (rentCast.medianPrice / census.medianIncome).toFixed(1) + 'x' : 'N/A'}

ARIA Score Breakdown:
${Object.values(ariaScore.breakdown).map(b => `- ${b.label}: ${b.score}/100 (weight: ${b.weight}%)`).join('\n')}
`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `You are a senior real estate market analyst at BrocaAI. Based on the following market data, write a concise 4-sentence market summary for a real estate broker.

${dataContext}

Rules:
- Exactly 4 sentences
- Start the first sentence with the city/location name
- Be specific with numbers from the data
- Include a clear recommendation (buy/sell/hold/list)
- Professional but direct tone
- Focus on actionable insights the broker can use with clients
- If some data is N/A, work with what's available and DO NOT mention data limitations
- Each sentence must provide unique insight — no repetition

Write only the 4 sentences, no headers or bullet points.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error('Claude error:', res.status, await res.text());
      return generateFallbackSummary(location, rentCast, fred, census, marketType);
    }

    const result = await res.json();
    return result?.content?.[0]?.text || generateFallbackSummary(location, rentCast, fred, census, marketType);
  } catch (err) {
    console.error('Claude API error:', err);
    return generateFallbackSummary(location, rentCast, fred, census, marketType);
  }
}

function generateFallbackSummary(
  location: string,
  rentCast: RentCastData,
  fred: FREDData,
  census: CensusData,
  marketType: MarketType,
): string {
  const parts: string[] = [];
  parts.push(`${location} is currently a ${marketType.label.toLowerCase()} market.`);
  if (rentCast.medianPrice) parts.push(`Median home price sits at $${rentCast.medianPrice.toLocaleString()} with ${rentCast.activeListings || 'limited'} active listings.`);
  if (fred.currentMortgageRate) parts.push(`The 30-year mortgage rate is ${fred.currentMortgageRate}%, trending ${fred.rateTrend}.`);
  if (census.medianIncome) parts.push(`Area median income is $${census.medianIncome.toLocaleString()}.`);
  if (parts.length < 4) parts.push('Contact your local market expert for more detailed guidance.');
  return parts.slice(0, 4).join(' ');
}

// ─── POST Handler ──────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please enter a valid city, zip code, or county' },
        { status: 400 }
      );
    }

    // 1. Resolve location to zip code
    const { zipCode, location, state } = await resolveZipCode(query.trim());

    // 2. Fetch all data sources in parallel
    const [rentCast, fred, census, bls] = await Promise.all([
      fetchRentCast(zipCode),
      fetchFRED(),
      fetchCensus(zipCode),
      fetchBLS(state),
    ]);

    // Use Census location name if available
    const displayLocation = census.locationName || location;

    // 3. Calculate ARIA Score
    const ariaScore = calculateARIAScore(rentCast, fred, census, bls);

    // 4. Determine market type
    const marketType = determineMarketType(rentCast, fred, census);

    // 5. Generate AI summary
    const aiSummary = await generateAISummary(
      displayLocation, rentCast, fred, census, bls, ariaScore, marketType
    );

    // 6. Build response
    const result: MarketAnalysisResult = {
      location: displayLocation,
      zipCode,
      state,
      county: null,
      ariaScore,
      marketType,
      rentCast,
      fred,
      census,
      bls,
      aiSummary,
      analyzedAt: new Date().toISOString(),
      dataSourceStatus: {
        rentCast: rentCast.medianPrice !== null,
        fred: fred.currentMortgageRate !== null,
        census: census.medianIncome !== null,
        bls: bls.inflationRate !== null,
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    const error = err as Error;
    console.error('Market intelligence error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze market' },
      { status: 500 }
    );
  }
}
