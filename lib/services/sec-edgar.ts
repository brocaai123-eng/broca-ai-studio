const SEC_BASE = 'https://efts.sec.gov/LATEST';
const SEC_DATA = 'https://data.sec.gov';

export interface SECFiling {
  company: string;
  cik: string;
  form_type: string;
  date_filed: string;
  description: string;
  url: string;
}

export interface InstitutionalActivity {
  fund_name: string;
  action: 'buy' | 'sell' | 'hold';
  shares: number;
  value_usd: number;
  filing_date: string;
}

export async function searchSECFilings(query: string, dateFrom?: string): Promise<SECFiling[]> {
  try {
    let url = `${SEC_BASE}/search-index?q=${encodeURIComponent(query)}&dateRange=custom`;
    if (dateFrom) {
      url += `&startdt=${dateFrom}`;
    }
    url += `&forms=10-K,10-Q,8-K,13F-HR&from=0&size=10`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BrocaAI admin@broca.ai',
        'Accept': 'application/json',
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.hits?.hits || []).map((hit: { _source: Record<string, string> }) => ({
      company: hit._source.entity_name || '',
      cik: hit._source.entity_id || '',
      form_type: hit._source.form_type || '',
      date_filed: hit._source.file_date || '',
      description: hit._source.display_names?.[0] || '',
      url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${hit._source.entity_id}&type=&dateb=&owner=include&count=10`,
    }));
  } catch {
    return [];
  }
}

export async function getRealEstateREITFilings(): Promise<SECFiling[]> {
  return searchSECFilings('"real estate" OR "REIT" OR "property acquisition" Florida', getDateMonthsAgo(6));
}

export async function getSmartMoneyAlerts(): Promise<InstitutionalActivity[]> {
  const majorREITs = ['Blackstone', 'Starwood', 'Invitation Homes', 'American Homes'];
  const activities: InstitutionalActivity[] = [];

  for (const name of majorREITs) {
    try {
      const filings = await searchSECFilings(`"${name}" Florida acquisition`, getDateMonthsAgo(3));
      for (const f of filings.slice(0, 2)) {
        activities.push({
          fund_name: name,
          action: 'buy',
          shares: 0,
          value_usd: 0,
          filing_date: f.date_filed,
        });
      }
    } catch {
      continue;
    }
  }

  return activities;
}

function getDateMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split('T')[0];
}
