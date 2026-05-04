const EIA_API_KEY = process.env.EIA_API_KEY || '';

export interface EnergyProfile {
  zip: string;
  consumption_kwh: number;
  capacity_pct: number;
  utility_name: string;
  grid_score: number; // 0-100
  ev_charging_opportunity: boolean;
}

export async function getEnergyData(stateAbbr: string = 'FL'): Promise<{
  consumption: number;
  generation: number;
  price_cents_kwh: number;
}> {
  try {
    const res = await fetch(
      `https://api.eia.gov/v2/electricity/retail-sales/data/?api_key=${EIA_API_KEY}&frequency=monthly&data[0]=revenue&data[1]=sales&data[2]=price&facets[stateid][]=${stateAbbr}&sort[0][column]=period&sort[0][direction]=desc&length=1`,
      { next: { revalidate: 604800 } }
    );

    if (!res.ok) return { consumption: 0, generation: 0, price_cents_kwh: 0 };
    const data = await res.json();
    const latest = data?.response?.data?.[0];

    return {
      consumption: latest?.sales || 0,
      generation: latest?.revenue || 0,
      price_cents_kwh: latest?.price || 0,
    };
  } catch {
    return { consumption: 0, generation: 0, price_cents_kwh: 0 };
  }
}

// Map ZIP prefix → [state abbreviation, utility name]
// Covers major FL, TX, CA, NY, GA, NC, NV, AZ territories
const ZIP_PREFIX_MAP: Record<string, [string, string]> = {
  // Florida
  '320': ['FL', 'Florida Power & Light'], '321': ['FL', 'Duke Energy Florida'],
  '322': ['FL', 'Florida Power & Light'], '323': ['FL', 'Gulf Power (FPL Group)'],
  '324': ['FL', 'Gulf Power (FPL Group)'], '325': ['FL', 'Gulf Power (FPL Group)'],
  '326': ['FL', 'Duke Energy Florida'],   '327': ['FL', 'Duke Energy Florida'],
  '328': ['FL', 'Duke Energy Florida'],   '329': ['FL', 'Duke Energy Florida'],
  '330': ['FL', 'Florida Power & Light'], '331': ['FL', 'Florida Power & Light'],
  '332': ['FL', 'Florida Power & Light'], '333': ['FL', 'Florida Power & Light'],
  '334': ['FL', 'Florida Power & Light'], '335': ['FL', 'Florida Power & Light'],
  '336': ['FL', 'Tampa Electric (TECO)'], '337': ['FL', 'Florida Power & Light'],
  '338': ['FL', 'Florida Power & Light'], '339': ['FL', 'Florida Power & Light'],
  '340': ['FL', 'Florida Power & Light'], '341': ['FL', 'Florida Power & Light'],
  '342': ['FL', 'Florida Power & Light'], '344': ['FL', 'Florida Power & Light'],
  '346': ['FL', 'Duke Energy Florida'],   '347': ['FL', 'Duke Energy Florida'],
  '348': ['FL', 'Florida Power & Light'], '349': ['FL', 'Florida Power & Light'],
  // Texas
  '750': ['TX', 'Oncor Electric Delivery'], '751': ['TX', 'Oncor Electric Delivery'],
  '752': ['TX', 'Oncor Electric Delivery'], '753': ['TX', 'Oncor Electric Delivery'],
  '770': ['TX', 'CenterPoint Energy'], '771': ['TX', 'CenterPoint Energy'],
  '772': ['TX', 'CenterPoint Energy'], '773': ['TX', 'CenterPoint Energy'],
  '787': ['TX', 'Austin Energy'], '788': ['TX', 'CPS Energy'],
  '798': ['TX', 'El Paso Electric'],
  // New York
  '100': ['NY', 'Con Edison'],  '101': ['NY', 'Con Edison'],
  '102': ['NY', 'Con Edison'],  '103': ['NY', 'Con Edison'],
  '104': ['NY', 'Con Edison'],  '110': ['NY', 'PSEG Long Island'],
  '117': ['NY', 'PSEG Long Island'], '120': ['NY', 'National Grid NY'],
  // California
  '900': ['CA', 'Southern California Edison'], '902': ['CA', 'Southern California Edison'],
  '906': ['CA', 'Los Angeles DWP'],            '908': ['CA', 'Southern California Edison'],
  '910': ['CA', 'Southern California Edison'], '913': ['CA', 'Southern California Gas'],
  '940': ['CA', 'Pacific Gas & Electric'],     '941': ['CA', 'Pacific Gas & Electric'],
  '945': ['CA', 'Pacific Gas & Electric'],     '949': ['CA', 'Southern California Edison'],
  '921': ['CA', 'San Diego Gas & Electric'],   '920': ['CA', 'San Diego Gas & Electric'],
  // Georgia
  '300': ['GA', 'Georgia Power'], '301': ['GA', 'Georgia Power'],
  '302': ['GA', 'Georgia Power'], '303': ['GA', 'Georgia Power'],
  '304': ['GA', 'Georgia Power'], '305': ['GA', 'Georgia Power'],
  // Nevada
  '890': ['NV', 'NV Energy'],    '891': ['NV', 'NV Energy'],
  '893': ['NV', 'NV Energy'],    '894': ['NV', 'NV Energy'],
  // Arizona
  '850': ['AZ', 'Arizona Public Service'], '851': ['AZ', 'Arizona Public Service'],
  '852': ['AZ', 'Arizona Public Service'], '853': ['AZ', 'Arizona Public Service'],
  '857': ['AZ', 'Tucson Electric Power'],  '858': ['AZ', 'Tucson Electric Power'],
  // North Carolina
  '270': ['NC', 'Duke Energy Carolinas'], '271': ['NC', 'Duke Energy Carolinas'],
  '272': ['NC', 'Duke Energy Carolinas'], '274': ['NC', 'Duke Energy Progress'],
  '275': ['NC', 'Duke Energy Progress'],  '276': ['NC', 'Duke Energy Progress'],
  '277': ['NC', 'Duke Energy Progress'],  '278': ['NC', 'Duke Energy Progress'],
  '279': ['NC', 'Duke Energy Progress'],  '280': ['NC', 'Duke Energy Carolinas'],
  // Illinois
  '600': ['IL', 'Commonwealth Edison'], '601': ['IL', 'Commonwealth Edison'],
  '602': ['IL', 'Commonwealth Edison'], '603': ['IL', 'Commonwealth Edison'],
  '604': ['IL', 'Commonwealth Edison'], '605': ['IL', 'Commonwealth Edison'],
  '606': ['IL', 'Commonwealth Edison'],
  // Washington
  '980': ['WA', 'Puget Sound Energy'], '981': ['WA', 'Puget Sound Energy'],
  '982': ['WA', 'Puget Sound Energy'], '983': ['WA', 'Puget Sound Energy'],
  '984': ['WA', 'Seattle City Light'], '985': ['WA', 'Puget Sound Energy'],
};

// State baseline retail electricity prices (¢/kWh, EIA 2023 residential averages)
const STATE_BASELINE_PRICE: Record<string, number> = {
  FL: 13.5, TX: 12.8, CA: 29.5, NY: 22.4, GA: 12.7, NC: 12.8,
  NV: 12.5, AZ: 13.1, IL: 15.2, WA: 10.7,
};

function getZipInfo(zip: string): { state: string; utilityName: string } {
  const prefix = zip.slice(0, 3);
  const match = ZIP_PREFIX_MAP[prefix];
  if (match) return { state: match[0], utilityName: match[1] };
  // Fallback: guess state from ZIP range
  const n = parseInt(zip, 10);
  if (n >= 10000 && n <= 14999) return { state: 'NY', utilityName: 'National Grid NY' };
  if (n >= 30000 && n <= 31999) return { state: 'GA', utilityName: 'Georgia Power' };
  if (n >= 60000 && n <= 62999) return { state: 'IL', utilityName: 'Commonwealth Edison' };
  if (n >= 70000 && n <= 71999) return { state: 'LA', utilityName: 'Entergy Louisiana' };
  if (n >= 73000 && n <= 74999) return { state: 'OK', utilityName: 'Oklahoma Gas & Electric' };
  if (n >= 75000 && n <= 79999) return { state: 'TX', utilityName: 'Oncor Electric Delivery' };
  if (n >= 80000 && n <= 81999) return { state: 'CO', utilityName: 'Xcel Energy' };
  if (n >= 85000 && n <= 86999) return { state: 'AZ', utilityName: 'Arizona Public Service' };
  if (n >= 89000 && n <= 89999) return { state: 'NV', utilityName: 'NV Energy' };
  if (n >= 90000 && n <= 96999) return { state: 'CA', utilityName: 'Pacific Gas & Electric' };
  if (n >= 98000 && n <= 99499) return { state: 'WA', utilityName: 'Puget Sound Energy' };
  return { state: 'FL', utilityName: 'Florida Power & Light' };
}

export async function getGridCapacityScore(zip: string): Promise<EnergyProfile> {
  const { state, utilityName } = getZipInfo(zip);
  const stateData = await getEnergyData(state);
  const baselinePrice = STATE_BASELINE_PRICE[state] ?? 13.5;

  // Derive capacity % from real EIA price data.
  // Higher retail price → higher grid load relative to capacity.
  // Baseline varies by state. Price > baseline suggests stressed grid.
  let capacityPct: number;
  if (stateData.price_cents_kwh > 0) {
    const priceRatio = stateData.price_cents_kwh / baselinePrice;
    // Map price ratio to capacity: baseline (ratio=1) → 65%, higher → up to 92%
    capacityPct = Math.min(92, Math.max(45, Math.round(65 * priceRatio)));
  } else {
    capacityPct = 65; // historical average grid utilization
  }

  const gridScore = Math.max(10, Math.round(100 - capacityPct));

  return {
    zip,
    consumption_kwh: stateData.consumption,
    capacity_pct: capacityPct,
    utility_name: utilityName,
    grid_score: gridScore,
    ev_charging_opportunity: capacityPct < 72,
  };
}
