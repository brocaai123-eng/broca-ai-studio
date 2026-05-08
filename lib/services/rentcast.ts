const RENTCAST_BASE = 'https://api.rentcast.io/v1';

import dns from 'node:dns';
import { Agent, fetch as undiciFetch } from 'undici';
import { checkAndIncrementRentCast } from './rentcast-limiter';

dns.setDefaultResultOrder('ipv4first');

/** Node's fetch uses Undici — default connect timeout is 10s and fails on slow/mobile networks. */
const rentcastDispatcher = new Agent({
  connectTimeout: 90_000,
  headersTimeout: 120_000,
  bodyTimeout: 120_000,
});

function rentcastKey(): string {
  const key = process.env.RENTCAST_API_KEY;
  if (!key) throw new Error('Missing RENTCAST_API_KEY');
  return key;
}

async function rentcastFetch<T>(path: string, query?: Record<string, string | number | undefined | null>): Promise<T> {
  const { allowed, used, limit } = await checkAndIncrementRentCast();
  if (!allowed) {
    throw new Error(`RentCast daily limit reached (${used}/${limit}). Try again tomorrow.`);
  }

  const url = new URL(`${RENTCAST_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      url.searchParams.set(k, String(v));
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  const res = await undiciFetch(url.toString(), {
    headers: {
      'X-Api-Key': rentcastKey(),
      Accept: 'application/json',
    },
    signal: controller.signal,
    dispatcher: rentcastDispatcher,
  });
  clearTimeout(timeout);

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    // RentCast returned a non-JSON body (e.g. plain-text error page)
    if (!res.ok) throw new Error(`RentCast API error ${res.status}: ${text.slice(0, 120)}`);
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'message' in data && typeof (data as any).message === 'string'
        ? (data as any).message
        : null) || `RentCast API error ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export type RentCastPropertyRecord = {
  id: string;
  formattedAddress: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFootage?: number | null;
  lotSize?: number | null;
  yearBuilt?: number | null;
  assessorID?: string | null;
  zoning?: string | null;
  lastSaleDate?: string | null;
  lastSalePrice?: number | null;
  owner?: {
    names?: string[];
    mailingAddress?: Record<string, unknown> | null;
  } | null;
  ownerOccupied?: boolean | null;
};

export type RentCastSaleListing = {
  id: string;
  formattedAddress: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFootage?: number | null;
  yearBuilt?: number | null;
  status?: string | null;
  price?: number | null;
  listedDate?: string | null;
  removedDate?: string | null;
  lastSeenDate?: string | null;
  daysOnMarket?: number | null;
};

export type RentCastAVMValue = {
  price: number;
  priceRangeLow?: number;
  priceRangeHigh?: number;
  subjectProperty?: {
    formattedAddress?: string;
  };
};

export async function getPropertyByAddress(address: string): Promise<RentCastPropertyRecord | null> {
  const results = await rentcastFetch<RentCastPropertyRecord[]>('/properties', { address, limit: 1 });
  return results?.[0] ?? null;
}

export async function listPropertiesByZip(zipCode: string, limit: number, offset: number): Promise<RentCastPropertyRecord[]> {
  return rentcastFetch<RentCastPropertyRecord[]>('/properties', { zipCode, limit, offset });
}

export async function listSaleListingsByZip(zipCode: string, limit: number, offset: number): Promise<RentCastSaleListing[]> {
  return rentcastFetch<RentCastSaleListing[]>('/listings/sale', { zipCode, limit, offset });
}

export async function getAVMValueByAddress(address: string): Promise<RentCastAVMValue | null> {
  try {
    return await rentcastFetch<RentCastAVMValue>('/avm/value', { address });
  } catch {
    return null;
  }
}

