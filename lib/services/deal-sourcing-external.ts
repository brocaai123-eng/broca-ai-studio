/**
 * Optional multi-source signals for deal sourcing (Socrata, Sentinel-2, county tax datasets).
 *
 * Configure any subset via env — missing URLs are skipped (RentCast-only scoring still works).
 *
 * Example (Socrata SODA 2.0):
 *   SOCRATA_APP_TOKEN=...
 *   SOCRATA_CODE_VIOLATIONS_URL=https://data.example.org/resource/abcd-1234.json
 *   SOCRATA_CODE_VIOLATIONS_ADDRESS_FIELD=property_address
 *
 *   SOCRATA_FORECLOSURE_URL=https://data.example.org/resource/efgh-5678.json
 *   SOCRATA_FORECLOSURE_ADDRESS_FIELD=situs_address
 *
 *   SOCRATA_PROBATE_URL=...
 *   SOCRATA_PROBATE_ADDRESS_FIELD=address
 *
 *   SOCRATA_TAX_DELINQUENCY_URL=...   (parcel / folio match)
 *   SOCRATA_TAX_PARCEL_FIELD=parcel_id
 *
 * Florida aggregate tax roll CSV (optional): set SOCRATA_TAX_DELINQUENCY_URL to a Socrata view
 * that includes your county’s parcel id column matching RentCast assessorID when possible.
 */

import { analyzePropertyCondition } from '@/lib/services/sentinel2';

export type ExternalSignalMeta = {
  socrata_queried: boolean;
  socrata_matched: boolean;
  sentinel_queried: boolean;
  tax_source_queried: boolean;
  tax_source_matched: boolean;
};

export type ExternalDealSignals = {
  foreclosure_case: boolean | null;
  probate_case: boolean | null;
  divorce_case: boolean | null;
  tax_delinquent: boolean | null;
  code_violations_count: number | null;
  satellite_condition_flag: boolean | null;
  meta: ExternalSignalMeta;
};

const APP_TOKEN = process.env.SOCRATA_APP_TOKEN?.trim() || undefined;

/**
 * Known working public open-data endpoints per state.
 * These are pre-configured so the system works out-of-the-box without manual env config.
 * Override any of these with the corresponding SOCRATA_* env vars.
 *
 * How to find your county's datasets: https://www.opendatanetwork.com/
 */
const STATE_DEFAULTS: Record<string, {
  codeViolationsUrl?: string;
  codeViolationsField?: string;
  foreclosureUrl?: string;
  foreclosureField?: string;
  taxUrl?: string;
  taxAddressField?: string;
  taxParcelField?: string;
}> = {
  // Florida – City of Miami open data (data.miamigov.com)
  FL: {
    codeViolationsUrl: 'https://data.miamigov.com/resource/7r4e-bced.json',
    codeViolationsField: 'street_address',
    // Broward County Certificate of Title / Foreclosure deeds
    foreclosureUrl: 'https://opendata.broward.org/resource/r6de-3ib4.json',
    foreclosureField: 'grantor_name',
  },
  // Texas – Dallas code violations
  TX: {
    codeViolationsUrl: 'https://www.dallasopendata.com/resource/5fj7-kuaq.json',
    codeViolationsField: 'address',
  },
  // California – LA building violations
  CA: {
    codeViolationsUrl: 'https://data.lacity.org/resource/a225-fyfh.json',
    codeViolationsField: 'address',
  },
};

function getEndpointConfig(state?: string | null) {
  const stateKey = (state || '').toUpperCase().trim();
  const stateDefaults = STATE_DEFAULTS[stateKey] || {};
  return {
    violationsUrl: process.env.SOCRATA_CODE_VIOLATIONS_URL?.trim() || stateDefaults.codeViolationsUrl || '',
    violationsField: process.env.SOCRATA_CODE_VIOLATIONS_ADDRESS_FIELD?.trim() || stateDefaults.codeViolationsField || 'address',
    foreclosureUrl: process.env.SOCRATA_FORECLOSURE_URL?.trim() || stateDefaults.foreclosureUrl || '',
    foreclosureField: process.env.SOCRATA_FORECLOSURE_ADDRESS_FIELD?.trim() || stateDefaults.foreclosureField || 'address',
    probateUrl: process.env.SOCRATA_PROBATE_URL?.trim() || '',
    probateField: process.env.SOCRATA_PROBATE_ADDRESS_FIELD?.trim() || 'address',
    divorceUrl: process.env.SOCRATA_DIVORCE_URL?.trim() || '',
    divorceField: process.env.SOCRATA_DIVORCE_ADDRESS_FIELD?.trim() || 'address',
    taxUrl: process.env.SOCRATA_TAX_DELINQUENCY_URL?.trim() || stateDefaults.taxUrl || '',
    taxParcelField: process.env.SOCRATA_TAX_PARCEL_FIELD?.trim() || stateDefaults.taxParcelField || 'parcel_id',
    taxAddressField: process.env.SOCRATA_TAX_ADDRESS_FIELD?.trim() || stateDefaults.taxAddressField || '',
  };
}

function escapeSocrataString(s: string) {
  return s.replace(/'/g, "''");
}

/** Street token for loose Socrata $where match (number + first words of street). */
export function addressSearchNeedle(formattedAddress: string): string {
  const cleaned = formattedAddress.replace(/\s+/g, ' ').trim();
  const noZip = cleaned.replace(/\b\d{5}(-\d{4})?\b.*$/i, '').trim();
  const parts = noZip.split(/[,]+/).map((p) => p.trim()).filter(Boolean);
  const line = parts[0] || cleaned;
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return escapeSocrataString(line.slice(0, 80));
  const chunk = tokens.slice(0, Math.min(5, tokens.length)).join(' ');
  return escapeSocrataString(chunk.slice(0, 80));
}

async function socrataCountWhere(url: string, addressField: string, needle: string): Promise<number | null> {
  if (!url || !addressField || !needle) return null;
  try {
    const u = new URL(url);
    u.searchParams.set('$where', `upper(${addressField}) like upper('%${needle}%')`);
    u.searchParams.set('$select', addressField);
    u.searchParams.set('$limit', '500');

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (APP_TOKEN) headers['X-App-Token'] = APP_TOKEN;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(u.toString(), { headers, signal: controller.signal, cache: 'no-store' });
    clearTimeout(t);
    if (!res.ok) return null;
    const rows = (await res.json()) as unknown;
    if (!Array.isArray(rows)) return null;
    return rows.length;
  } catch {
    return null;
  }
}

async function socrataParcelMatch(
  url: string,
  parcelField: string,
  assessorId: string,
): Promise<boolean | null> {
  if (!url || !parcelField || !assessorId) return null;
  try {
    const u = new URL(url);
    const id = escapeSocrataString(assessorId.trim());
    u.searchParams.set('$where', `${parcelField}='${id}'`);
    u.searchParams.set('$select', parcelField);
    u.searchParams.set('$limit', '1');

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (APP_TOKEN) headers['X-App-Token'] = APP_TOKEN;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(u.toString(), { headers, signal: controller.signal, cache: 'no-store' });
    clearTimeout(t);
    if (!res.ok) return null;
    const rows = (await res.json()) as unknown;
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return null;
  }
}

export async function fetchExternalDealSignals(input: {
  formattedAddress: string;
  zip?: string | null;
  city?: string | null;
  state?: string | null;
  assessorId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<ExternalDealSignals> {
  const needle = addressSearchNeedle(input.formattedAddress);
  const cfg = getEndpointConfig(input.state);

  const {
    violationsUrl, violationsField,
    foreclosureUrl, foreclosureField,
    probateUrl, probateField,
    divorceUrl, divorceField,
    taxUrl, taxParcelField, taxAddressField,
  } = cfg;

  let socrataQueried = false;
  let socrataMatched = false;
  let taxQueried = false;
  let taxMatched = false;

  const [violationsCount, foreclosureHits, probateHits, divorceHits, taxHit] = await Promise.all([
    (async () => {
      if (!violationsUrl) return null;
      socrataQueried = true;
      const c = await socrataCountWhere(violationsUrl, violationsField, needle);
      if (c && c > 0) socrataMatched = true;
      return c;
    })(),
    (async () => {
      if (!foreclosureUrl) return null;
      socrataQueried = true;
      const c = await socrataCountWhere(foreclosureUrl, foreclosureField, needle);
      if (c && c > 0) socrataMatched = true;
      return c;
    })(),
    (async () => {
      if (!probateUrl) return null;
      socrataQueried = true;
      const c = await socrataCountWhere(probateUrl, probateField, needle);
      if (c && c > 0) socrataMatched = true;
      return c;
    })(),
    (async () => {
      if (!divorceUrl) return null;
      socrataQueried = true;
      const c = await socrataCountWhere(divorceUrl, divorceField, needle);
      if (c && c > 0) socrataMatched = true;
      return c;
    })(),
    (async () => {
      if (!taxUrl) return null;
      taxQueried = true;
      if (input.assessorId) {
        const hit = await socrataParcelMatch(taxUrl, taxParcelField, input.assessorId);
        if (hit) taxMatched = true;
        return hit;
      }
      if (taxAddressField) {
        const c = await socrataCountWhere(taxUrl, taxAddressField, needle);
        const hit = c != null && c > 0;
        if (hit) taxMatched = true;
        return hit;
      }
      return null;
    })(),
  ]);

  let sentinelQueried = false;
  let satelliteFlag: boolean | null = null;
  const lat = input.latitude ?? null;
  const lng = input.longitude ?? null;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    sentinelQueried = true;
    try {
      const cond = await analyzePropertyCondition(lat, lng);
      satelliteFlag =
        cond.overgrown_vegetation ||
        cond.roof_damage ||
        cond.pool_neglect ||
        cond.vacant_lot ||
        false;
    } catch {
      satelliteFlag = null;
    }
  }

  return {
    foreclosure_case: foreclosureHits != null ? foreclosureHits > 0 : null,
    probate_case: probateHits != null ? probateHits > 0 : null,
    divorce_case: divorceHits != null ? divorceHits > 0 : null,
    tax_delinquent: taxHit != null ? taxHit : null,
    code_violations_count: violationsCount != null ? violationsCount : null,
    satellite_condition_flag: satelliteFlag,
    meta: {
      socrata_queried: socrataQueried,
      socrata_matched: socrataMatched,
      sentinel_queried: sentinelQueried,
      tax_source_queried: taxQueried,
      tax_source_matched: taxMatched,
    },
  };
}
