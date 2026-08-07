/**
 * CMS NPPES / NPI Registry helpers.
 * - Live search via official NPI Registry API (for seeding & enrichment)
 * - Row mapping + upsert into Supabase nppes_providers
 * Docs: https://npiregistry.cms.hhs.gov/api-page
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type NppesEntityType = '1' | '2';

export interface NppesProvider {
  npi: string;
  entity_type: NppesEntityType;
  provider_last_name: string | null;
  provider_first_name: string | null;
  provider_middle_name: string | null;
  provider_org_name: string | null;
  credentials: string | null;
  gender: string | null;
  primary_taxonomy_code: string | null;
  primary_taxonomy_desc: string | null;
  specialty: string | null;
  practice_address_1: string | null;
  practice_address_2: string | null;
  practice_city: string | null;
  practice_state: string | null;
  practice_zip: string | null;
  practice_phone: string | null;
  practice_fax: string | null;
  mailing_address_1: string | null;
  mailing_address_2: string | null;
  mailing_city: string | null;
  mailing_state: string | null;
  mailing_zip: string | null;
  mailing_phone: string | null;
  enumeration_date: string | null;
  last_updated: string | null;
  deactivation_date: string | null;
  status: 'active' | 'deactivated';
  search_name: string | null;
  raw_payload?: Record<string, unknown> | null;
  updated_at?: string;
}

export interface NppesSearchFilters {
  q?: string;
  npi?: string;
  specialty?: string;
  state?: string;
  city?: string;
  zip?: string;
  entityType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

const REGISTRY_URL = 'https://npiregistry.cms.hhs.gov/api/';

function adminDb(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function cleanZip(zip?: string | null): string | null {
  if (!zip) return null;
  const digits = String(zip).replace(/\D/g, '');
  return digits.slice(0, 5) || null;
}

/** Normalize CMS dates (MM/DD/YYYY or YYYY-MM-DD) to ISO date or null */
function normalizeDate(value?: string | null): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mm = m[1].padStart(2, '0');
    const dd = m[2].padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }
  return null;
}

function buildSearchName(row: Partial<NppesProvider>): string {
  if (row.entity_type === '2') {
    return (row.provider_org_name || '').trim().toLowerCase();
  }
  return [row.provider_first_name, row.provider_middle_name, row.provider_last_name, row.credentials]
    .filter(Boolean)
    .join(' ')
    .trim()
    .toLowerCase();
}

export function displayName(p: NppesProvider): string {
  if (p.entity_type === '2') return p.provider_org_name || `Org ${p.npi}`;
  const parts = [p.provider_first_name, p.provider_middle_name, p.provider_last_name].filter(Boolean);
  const name = parts.join(' ') || `Provider ${p.npi}`;
  return p.credentials ? `${name}, ${p.credentials}` : name;
}

/** Map a single NPI Registry API result to our table shape */
export function mapRegistryResult(item: any): NppesProvider | null {
  const npi = String(item?.number || item?.npi || '').trim();
  if (!npi || !/^\d{10}$/.test(npi)) return null;

  const basic = item.basic || {};
  const entityType: NppesEntityType = String(item.enumeration_type || '').includes('NPI-2') || basic.organization_name
    ? '2'
    : '1';

  const addresses: any[] = Array.isArray(item.addresses) ? item.addresses : [];
  const practice = addresses.find((a) => a.address_purpose === 'LOCATION') || addresses[0] || {};
  const mailing = addresses.find((a) => a.address_purpose === 'MAILING') || practice;

  const taxonomies: any[] = Array.isArray(item.taxonomies) ? item.taxonomies : [];
  const primaryTax =
    taxonomies.find((t) => t.primary === true || t.primary === 'True' || t.primary === 'Y') ||
    taxonomies[0] ||
    {};

  const deactivated = !!basic.deactivation_date;
  const row: NppesProvider = {
    npi,
    entity_type: entityType,
    provider_last_name: basic.last_name || null,
    provider_first_name: basic.first_name || null,
    provider_middle_name: basic.middle_name || null,
    provider_org_name: basic.organization_name || basic.authorized_official_organization_name || null,
    credentials: basic.credential || null,
    gender: basic.gender || null,
    primary_taxonomy_code: primaryTax.code || null,
    primary_taxonomy_desc: primaryTax.desc || null,
    specialty: primaryTax.desc || null,
    practice_address_1: practice.address_1 || null,
    practice_address_2: practice.address_2 || null,
    practice_city: practice.city || null,
    practice_state: practice.state || null,
    practice_zip: cleanZip(practice.postal_code || practice.zip),
    practice_phone: practice.telephone_number || null,
    practice_fax: practice.fax_number || null,
    mailing_address_1: mailing.address_1 || null,
    mailing_address_2: mailing.address_2 || null,
    mailing_city: mailing.city || null,
    mailing_state: mailing.state || null,
    mailing_zip: cleanZip(mailing.postal_code || mailing.zip),
    mailing_phone: mailing.telephone_number || null,
    enumeration_date: normalizeDate(basic.enumeration_date),
    last_updated: normalizeDate(basic.last_updated),
    deactivation_date: normalizeDate(basic.deactivation_date),
    status: deactivated ? 'deactivated' : 'active',
    search_name: null,
    raw_payload: null,
    updated_at: new Date().toISOString(),
  };
  row.search_name = buildSearchName(row);
  return row;
}

/** Map a CMS monthly CSV row (V.2 header names) to our table shape */
export function mapCsvRow(raw: Record<string, string>): NppesProvider | null {
  const npi = String(raw['NPI'] || '').trim();
  if (!npi || !/^\d{10}$/.test(npi)) return null;

  const entityType = (String(raw['Entity Type Code'] || '1').trim() === '2' ? '2' : '1') as NppesEntityType;
  const deactivated = !!(raw['NPI Deactivation Date'] || '').trim();

  const row: NppesProvider = {
    npi,
    entity_type: entityType,
    provider_last_name: raw['Provider Last Name (Legal Name)'] || null,
    provider_first_name: raw['Provider First Name'] || null,
    provider_middle_name: raw['Provider Middle Name'] || null,
    provider_org_name: raw['Provider Organization Name (Legal Business Name)'] || null,
    credentials: raw['Provider Credential Text'] || null,
    gender: raw['Provider Sex Code'] || null,
    primary_taxonomy_code: raw['Healthcare Provider Taxonomy Code_1'] || null,
    primary_taxonomy_desc: raw['Healthcare Provider Taxonomy_1'] || null,
    specialty: raw['Healthcare Provider Taxonomy_1'] || raw['Healthcare Provider Taxonomy Code_1'] || null,
    practice_address_1: raw['Provider First Line Business Practice Location Address'] || null,
    practice_address_2: raw['Provider Second Line Business Practice Location Address'] || null,
    practice_city: raw['Provider Business Practice Location Address City Name'] || null,
    practice_state: raw['Provider Business Practice Location Address State Name'] || null,
    practice_zip: cleanZip(raw['Provider Business Practice Location Address Postal Code']),
    practice_phone: raw['Provider Business Practice Location Address Telephone Number'] || null,
    practice_fax: raw['Provider Business Practice Location Address Fax Number'] || null,
    mailing_address_1: raw['Provider First Line Business Mailing Address'] || null,
    mailing_address_2: raw['Provider Second Line Business Mailing Address'] || null,
    mailing_city: raw['Provider Business Mailing Address City Name'] || null,
    mailing_state: raw['Provider Business Mailing Address State Name'] || null,
    mailing_zip: cleanZip(raw['Provider Business Mailing Address Postal Code']),
    mailing_phone: raw['Provider Business Mailing Address Telephone Number'] || null,
    enumeration_date: normalizeDate(raw['Provider Enumeration Date']),
    last_updated: normalizeDate(raw['Last Update Date']),
    deactivation_date: normalizeDate(raw['NPI Deactivation Date']),
    status: deactivated ? 'deactivated' : 'active',
    search_name: null,
    raw_payload: null,
    updated_at: new Date().toISOString(),
  };
  row.search_name = buildSearchName(row);
  return row;
}

export async function upsertProviders(rows: NppesProvider[]): Promise<number> {
  if (!rows.length) return 0;
  const supabase = adminDb();
  // Never store raw_payload on bulk upsert (can break / bloat rows)
  const cleaned = rows.map(({ raw_payload: _raw, ...rest }) => ({
    ...rest,
    enumeration_date: normalizeDate(rest.enumeration_date),
    last_updated: normalizeDate(rest.last_updated),
    deactivation_date: normalizeDate(rest.deactivation_date),
  }));

  const { error } = await supabase.from('nppes_providers').upsert(cleaned, { onConflict: 'npi' });
  if (error) throw new Error(error.message);
  return cleaned.length;
}

export async function searchProviders(filters: NppesSearchFilters) {
  const supabase = adminDb();
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 25));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('nppes_providers')
    .select('*', { count: 'exact' })
    .order('search_name', { ascending: true })
    .range(from, to);

  if (filters.npi) query = query.eq('npi', filters.npi.trim());
  if (filters.state) query = query.eq('practice_state', filters.state.trim().toUpperCase());
  if (filters.city) query = query.ilike('practice_city', filters.city.trim());
  if (filters.zip) query = query.eq('practice_zip', cleanZip(filters.zip) || filters.zip.trim());
  if (filters.specialty) query = query.ilike('specialty', `%${filters.specialty.trim()}%`);
  if (filters.entityType === '1' || filters.entityType === '2') {
    query = query.eq('entity_type', filters.entityType);
  }
  if (filters.status === 'active' || filters.status === 'deactivated') {
    query = query.eq('status', filters.status);
  } else {
    query = query.eq('status', 'active');
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    if (/^\d{10}$/.test(q)) {
      query = query.eq('npi', q);
    } else {
      query = query.or(
        `search_name.ilike.%${q}%,provider_last_name.ilike.%${q}%,provider_org_name.ilike.%${q}%,provider_first_name.ilike.%${q}%`,
      );
    }
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { rows: (data || []) as NppesProvider[], total: count || 0, page, limit };
}

export async function getProvider(npi: string): Promise<NppesProvider | null> {
  const supabase = adminDb();
  const { data, error } = await supabase.from('nppes_providers').select('*').eq('npi', npi).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as NppesProvider) || null;
}

export async function getProviderStats() {
  const supabase = adminDb();
  const [{ count: total }, { count: individuals }, { count: orgs }, { count: withPhone }] = await Promise.all([
    supabase.from('nppes_providers').select('*', { count: 'exact', head: true }),
    supabase.from('nppes_providers').select('*', { count: 'exact', head: true }).eq('entity_type', '1'),
    supabase.from('nppes_providers').select('*', { count: 'exact', head: true }).eq('entity_type', '2'),
    supabase.from('nppes_providers').select('*', { count: 'exact', head: true }).not('practice_phone', 'is', null),
  ]);

  const { data: lastJob } = await supabase
    .from('nppes_import_jobs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    total: total || 0,
    individuals: individuals || 0,
    organizations: orgs || 0,
    with_phone: withPhone || 0,
    last_import: lastJob || null,
  };
}

export interface RegistrySeedOptions {
  state?: string;
  city?: string;
  zip?: string;
  taxonomyDescription?: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  limit?: number;
}

/**
 * Fetch providers from the live CMS NPI Registry API and upsert into Supabase.
 * Max 200 results per Registry request — we page until limit or exhausted.
 */
export async function seedFromRegistryApi(opts: RegistrySeedOptions): Promise<{
  fetched: number;
  upserted: number;
}> {
  const target = Math.min(2000, Math.max(1, opts.limit || 200));
  const pageSize = 200;
  let skip = 0;
  let fetched = 0;
  let upserted = 0;
  const batch: NppesProvider[] = [];

  while (fetched < target) {
    const params = new URLSearchParams({
      version: '2.1',
      limit: String(Math.min(pageSize, target - fetched)),
      skip: String(skip),
    });
    if (opts.state) params.set('state', opts.state.toUpperCase());
    if (opts.city) params.set('city', opts.city);
    if (opts.zip) params.set('postal_code', cleanZip(opts.zip) || opts.zip);
    if (opts.taxonomyDescription) params.set('taxonomy_description', opts.taxonomyDescription);
    if (opts.firstName) params.set('first_name', opts.firstName);
    if (opts.lastName) params.set('last_name', opts.lastName);
    if (opts.organizationName) params.set('organization_name', opts.organizationName);
    // CMS often returns better results when address purpose is LOCATION
    params.set('address_purpose', 'LOCATION');

    const res = await fetch(`${REGISTRY_URL}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BrocaAI/1.0 (provider-directory)',
      },
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`NPI Registry error ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
    }
    const json = await res.json();
    if (json.Errors) {
      const msg = Array.isArray(json.Errors)
        ? json.Errors.map((e: any) => e.description || e.message || JSON.stringify(e)).join('; ')
        : String(json.Errors);
      throw new Error(`NPI Registry: ${msg}`);
    }
    const results: any[] = json.results || [];
    if (!results.length) break;

    for (const item of results) {
      const mapped = mapRegistryResult(item);
      if (mapped) batch.push(mapped);
    }
    fetched += results.length;
    skip += results.length;

    if (batch.length >= 100) {
      upserted += await upsertProviders(batch.splice(0, batch.length));
    }
    if (results.length < pageSize) break;
  }

  if (batch.length) {
    upserted += await upsertProviders(batch);
  }

  return { fetched, upserted };
}

export const CSV_EXPORT_COLUMNS = [
  'npi',
  'entity_type',
  'provider_org_name',
  'provider_first_name',
  'provider_middle_name',
  'provider_last_name',
  'credentials',
  'specialty',
  'primary_taxonomy_code',
  'practice_address_1',
  'practice_address_2',
  'practice_city',
  'practice_state',
  'practice_zip',
  'practice_phone',
  'mailing_address_1',
  'mailing_city',
  'mailing_state',
  'mailing_zip',
  'mailing_phone',
  'status',
] as const;

export function providerToCsvRow(p: NppesProvider): Record<string, string> {
  const out: Record<string, string> = {};
  for (const col of CSV_EXPORT_COLUMNS) {
    const val = (p as any)[col];
    out[col] = val == null ? '' : String(val);
  }
  out.entity_type = p.entity_type === '2' ? 'Organization' : 'Individual';
  out.display_name = displayName(p);
  return out;
}
