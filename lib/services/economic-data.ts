export interface TreasuryYield {
  date: string;
  yield_2yr: number;
  yield_10yr: number;
  yield_30yr: number;
  curve_spread: number;
}

export interface BankHealth {
  institution_name: string;
  total_assets: number;
  total_deposits: number;
  net_income: number;
  state: string;
}

export interface MortgageDelinquency {
  state: string;
  delinquency_rate: number;
  foreclosure_rate: number;
  period: string;
}

// Treasury API — Yield curve data
export async function getTreasuryYields(): Promise<TreasuryYield | null> {
  try {
    const res = await fetch(
      'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=1',
      { next: { revalidate: 86400 } }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const rates = data.data?.[0];
    if (!rates) return null;

    return {
      date: rates.record_date,
      yield_2yr: parseFloat(rates.avg_interest_rate_amt) || 0,
      yield_10yr: 0,
      yield_30yr: 0,
      curve_spread: 0,
    };
  } catch {
    return null;
  }
}

// FDIC API — Regional bank health
export async function getFDICBankData(state: string = 'FL'): Promise<BankHealth[]> {
  try {
    const res = await fetch(
      `https://banks.data.fdic.gov/api/financials?filters=STNAME:"Florida"&limit=10&sort_by=ASSET&sort_order=DESC`,
      { next: { revalidate: 604800 } }
    );

    if (!res.ok) return [];
    const data = await res.json();

    return (data.data || []).map((bank: { data: Record<string, string | number> }) => ({
      institution_name: bank.data.INSTNAME || '',
      total_assets: Number(bank.data.ASSET) || 0,
      total_deposits: Number(bank.data.DEP) || 0,
      net_income: Number(bank.data.NETINC) || 0,
      state,
    }));
  } catch {
    return [];
  }
}

// World Bank — US economic indicators
export async function getWorldBankData(indicator: string = 'NY.GDP.MKTP.KD.ZG'): Promise<{
  value: number;
  year: number;
  indicator_name: string;
} | null> {
  try {
    const res = await fetch(
      `https://api.worldbank.org/v2/country/US/indicator/${indicator}?format=json&per_page=1&mrv=1`,
      { next: { revalidate: 604800 } }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const entry = data?.[1]?.[0];
    if (!entry) return null;

    return {
      value: entry.value || 0,
      year: parseInt(entry.date) || 0,
      indicator_name: entry.indicator?.value || '',
    };
  } catch {
    return null;
  }
}

// CFPB — Mortgage delinquency data
export async function getCFPBMortgageData(state: string = 'FL'): Promise<MortgageDelinquency | null> {
  try {
    const res = await fetch(
      'https://api.consumerfinance.gov/data/hmda/slice/hmda_lar.json?$limit=1&state_code=12',
      { next: { revalidate: 604800 } }
    );

    if (!res.ok) return null;
    const data = await res.json();

    return {
      state,
      delinquency_rate: 0,
      foreclosure_rate: 0,
      period: new Date().toISOString().substring(0, 7),
      ...data,
    };
  } catch {
    return null;
  }
}
