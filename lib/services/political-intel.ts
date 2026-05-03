export interface PoliticalDonation {
  committee_name: string;
  total_amount: number;
  party: string;
  state: string;
}

export interface CongressBill {
  number: string;
  title: string;
  status: string;
  introduced_date: string;
  url: string;
}

// FEC API — Campaign finance data
export async function getFECData(zip: string): Promise<PoliticalDonation[]> {
  try {
    const res = await fetch(
      `https://api.open.fec.gov/v1/schedules/schedule_a/?zip=${zip}&sort=-contribution_receipt_amount&per_page=10&api_key=DEMO_KEY`,
      { next: { revalidate: 604800 } }
    );

    if (!res.ok) return [];
    const data = await res.json();

    const committees: Record<string, PoliticalDonation> = {};
    for (const result of data.results || []) {
      const name = result.committee?.name || 'Unknown';
      if (!committees[name]) {
        committees[name] = {
          committee_name: name,
          total_amount: 0,
          party: result.committee?.party || 'N/A',
          state: result.contributor_state || '',
        };
      }
      committees[name].total_amount += result.contribution_receipt_amount || 0;
    }

    return Object.values(committees);
  } catch {
    return [];
  }
}

// Congress.gov API — Housing-related bills
export async function getHousingBills(): Promise<CongressBill[]> {
  try {
    const res = await fetch(
      'https://api.congress.gov/v3/bill?query=housing+real+estate&limit=5&sort=updateDate+desc&api_key=',
      { next: { revalidate: 86400 } }
    );

    if (!res.ok) return [];
    const data = await res.json();

    return (data.bills || []).map((bill: Record<string, unknown>) => ({
      number: String(bill.number || ''),
      title: String(bill.title || ''),
      status: String((bill.latestAction as Record<string, string>)?.text || ''),
      introduced_date: String(bill.introducedDate || ''),
      url: String(bill.url || ''),
    }));
  } catch {
    return [];
  }
}
