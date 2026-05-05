import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { listSaleListingsByZip, listPropertiesByZip, getAVMValueByAddress } from '@/lib/services/rentcast';
import { computeMotivatedSellerScore } from '@/lib/services/motivated-seller';
import { fetchExternalDealSignals } from '@/lib/services/deal-sourcing-external';
import { retryWithBackoff, withTimeout } from '@/lib/utils/with-timeout';

// Bootstrap fetches listing pages + computes scores; no per-property API calls so it runs fast.
export const maxDuration = 60;

async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const zip = String(body.zip || '').trim();
    const limit = Math.min(500, Math.max(5, Number(body.limit || 100)));
    if (!zip || !/^\d{5}$/.test(zip)) {
      return NextResponse.json({ error: 'zip is required (5 digits)' }, { status: 400 });
    }

    /** Detect corporate/investor entity from owner name strings */
    function isCorporateOwner(names: string[]): boolean {
      if (!names || names.length === 0) return false;
      const pattern = /\b(LLC|CORP|INC|LP|LLP|LTD|TRUST|REIT|HOLDINGS|PROPERTIES|INVESTMENTS|REALTY|PARTNERS|FUND|GROUP|VENTURES|ASSOCIATES)\b/i;
      return names.some((n) => pattern.test(n));
    }

    /** Detect out-of-state owner from mailing address */
    function isOutOfStateOwner(mailingAddress: any, propertyState: string | null | undefined): boolean {
      if (!mailingAddress || !propertyState) return false;
      const mailState = (mailingAddress.state || '').trim().toUpperCase();
      const propState = propertyState.trim().toUpperCase();
      return mailState.length === 2 && mailState !== propState;
    }

    // Pull a small set of real listings to populate the finder quickly.
    // Paginate through all RentCast listings for this ZIP (each page is up to `limit` items).
    const PAGE_SIZE = limit;
    const MAX_RECORDS = 200; // cap to prevent timeout even without per-property calls
    const allListings: Awaited<ReturnType<typeof listSaleListingsByZip>> = [];
    for (let offset = 0; allListings.length < MAX_RECORDS; offset += PAGE_SIZE) {
      const page = await retryWithBackoff(
        () => withTimeout(listSaleListingsByZip(zip, PAGE_SIZE, offset), 90000, `RentCast listings offset=${offset}`),
        { attempts: 3, baseDelayMs: 500, maxDelayMs: 4000 },
      );
      if (!page || page.length === 0) break;
      allListings.push(...page);
      if (page.length < PAGE_SIZE) break; // last page
    }
    const listings = allListings.slice(0, MAX_RECORDS);

    let processed = 0;

    // Pre-fetch ZIP-level external signals once (not per-property) to avoid per-property Socrata round-trips.
    // This gives us a ZIP-level code violation count and broad foreclosure presence, which we distribute to properties.
    const nullExt = { foreclosure_case: null, probate_case: null, divorce_case: null, tax_delinquent: null, code_violations_count: null, satellite_condition_flag: null, meta: {} as any };
    const zipExt = await withTimeout(
      fetchExternalDealSignals({ formattedAddress: zip, zip, state: null }),
      12000, 'ZIP-level external signals',
    ).catch(() => nullExt);

    /** Process a single property record into a DB upsert row */
    async function processProperty(args: {
      id: string;
      address: string;
      zipCode: string;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      state?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      bedrooms?: number | null;
      bathrooms?: number | null;
      squareFootage?: number | null;
      lotSize?: number | null;
      yearBuilt?: number | null;
      propertyType?: string | null;
      zoning?: string | null;
      assessorID?: string | null;
      ownerNames?: string[];
      ownerMailingAddress?: any;
      ownerOccupied?: boolean | null;
      lastSaleDate?: string | null;
      lastSalePrice?: number | null;
      listPrice?: number | null;
      daysOnMarket?: number | null;
      priceChanges?: Array<{ price: number }>;
      skipAVM?: boolean;
    }) {
      // Skip AVM during bulk bootstrap — fetching AVM for every property times out Vercel (300s+).
      // AVM can be refreshed per-property via the Property Intelligence section.
      const avm = args.skipAVM ? null : await getAVMValueByAddress(args.address).catch(() => null);

      const corporate = isCorporateOwner(args.ownerNames ?? []);
      const outOfState = isOutOfStateOwner(args.ownerMailingAddress, args.state ?? null);
      const effectiveAbsentee = args.ownerOccupied === false || (args.ownerOccupied == null && (corporate || outOfState));
      const dom = args.daysOnMarket ?? null;
      const priceChanges = args.priceChanges ?? [];
      const hasPriceCut = priceChanges.length >= 2 && priceChanges[0].price < priceChanges[priceChanges.length - 1].price;

      const ms = computeMotivatedSellerScore({
        ownerOccupied: effectiveAbsentee ? false : (args.ownerOccupied ?? null),
        lastSaleDate: args.lastSaleDate ?? null,
        lastSalePrice: args.lastSalePrice ?? null,
        listPrice: args.listPrice ?? null,
        avmPrice: avm?.price ?? null,
        daysOnMarket: dom,
        extendedDomFlag: (dom ?? 0) >= 180,
        foreclosure_case: zipExt.foreclosure_case,
        tax_delinquent: zipExt.tax_delinquent,
        probate_case: zipExt.probate_case,
        divorce_case: zipExt.divorce_case,
        satellite_condition_flag: null, // per-property satellite requires lat/lng premium API
        code_violations_count: zipExt.code_violations_count,
        corporate_owner: corporate,
        out_of_state_owner: outOfState,
        price_cut: hasPriceCut,
      });

      return {
        rentcast_property_id: args.id,
        formatted_address: args.address,
        address_line1: args.addressLine1 ?? null,
        address_line2: args.addressLine2 ?? null,
        city: args.city ?? null,
        state: args.state ?? null,
        zip: args.zipCode ?? zip,
        latitude: args.latitude ?? null,
        longitude: args.longitude ?? null,
        bedrooms: args.bedrooms ?? null,
        bathrooms: args.bathrooms ?? null,
        square_footage: args.squareFootage ?? null,
        lot_size: args.lotSize ?? null,
        year_built: args.yearBuilt ?? null,
        property_type: args.propertyType ?? null,
        zoning: args.zoning ?? null,
        assessor_id: args.assessorID ?? null,
        owner_names: args.ownerNames ?? [],
        owner_mailing_address: args.ownerMailingAddress ?? null,
        owner_occupied: effectiveAbsentee ? false : (args.ownerOccupied ?? null),
        last_sale_date: args.lastSaleDate ? new Date(args.lastSaleDate).toISOString() : null,
        last_sale_price: args.lastSalePrice ?? null,
        estimated_value: avm?.price ?? null,
        estimated_value_low: avm?.priceRangeLow ?? null,
        estimated_value_high: avm?.priceRangeHigh ?? null,
        avm_last_updated_at: avm ? new Date().toISOString() : null,
        extended_dom: (dom ?? 0) >= 180,
        below_value: avm?.price != null && args.listPrice != null ? args.listPrice <= avm.price * 0.9 : null,
        motivated_seller_score: ms.score,
        motivated_seller_label: ms.label,
        motivated_seller_breakdown: ms.breakdown,
        updated_at: new Date().toISOString(),
      };
    }

    /** Run at most `concurrency` promises at a time */
    async function pMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
      const results: R[] = [];
      let idx = 0;
      async function worker() {
        while (idx < items.length) {
          const i = idx++;
          results[i] = await fn(items[i]);
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
      return results;
    }

    // If there are no active sale listings for this ZIP, fall back to property records.
    if (!listings || listings.length === 0) {
      const allProps: Awaited<ReturnType<typeof listPropertiesByZip>> = [];
      for (let offset = 0; allProps.length < MAX_RECORDS; offset += PAGE_SIZE) {
        const page = await retryWithBackoff(
          () => withTimeout(listPropertiesByZip(zip, PAGE_SIZE, offset), 90000, `RentCast properties offset=${offset}`),
          { attempts: 3, baseDelayMs: 500, maxDelayMs: 4000 },
        );
        if (!page || page.length === 0) break;
        allProps.push(...page);
        if (page.length < PAGE_SIZE) break; // last page
      }
      const props = allProps.slice(0, MAX_RECORDS);

      const rows = await pMap(props, async (p) => {
        try {
          return await processProperty({
            id: p.id,
            address: p.formattedAddress,
            zipCode: p.zipCode ?? zip,
            addressLine1: p.addressLine1,
            addressLine2: p.addressLine2,
            city: p.city,
            state: p.state,
            latitude: p.latitude,
            longitude: p.longitude,
            bedrooms: p.bedrooms,
            bathrooms: p.bathrooms,
            squareFootage: p.squareFootage,
            lotSize: p.lotSize,
            yearBuilt: p.yearBuilt,
            propertyType: p.propertyType,
            zoning: p.zoning,
            assessorID: p.assessorID,
            ownerNames: p.owner?.names,
            ownerMailingAddress: p.owner?.mailingAddress,
            ownerOccupied: p.ownerOccupied,
            lastSaleDate: p.lastSaleDate,
            lastSalePrice: p.lastSalePrice,
            skipAVM: true,
          });
        } catch (e) {
          console.error('[deal-sourcing/bootstrap] property failed', p?.id, e);
          return null;
        }
      }, 8);

      const validRows = rows.filter(Boolean) as NonNullable<(typeof rows)[0]>[];
      // Deduplicate by rentcast_property_id — RentCast may return the same property multiple times
      const dedupedRows = [...new Map(validRows.map((r) => [r.rentcast_property_id, r])).values()];
      if (dedupedRows.length > 0) {
        const { error } = await supabaseAdmin.from('properties').upsert(dedupedRows, { onConflict: 'rentcast_property_id' });
        if (error) throw error;
      }
      processed = dedupedRows.length;
      return NextResponse.json({ success: true, zip, processed, source: 'properties' });
    }

    // Sale listings path — use listing fields directly; skip per-property getPropertyByAddress + AVM
    // to avoid 300s Vercel timeout. Owner/AVM data can be fetched on-demand via Property Intelligence.
    const listingResults = await pMap(listings, async (listing) => {
      try {
        const address = listing.formattedAddress;
        return await processProperty({
          id: listing.id,
          address,
          zipCode: listing.zipCode ?? zip,
          addressLine1: listing.addressLine1,
          addressLine2: listing.addressLine2,
          city: listing.city,
          state: listing.state,
          latitude: listing.latitude,
          longitude: listing.longitude,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          squareFootage: listing.squareFootage,
          yearBuilt: listing.yearBuilt,
          propertyType: listing.propertyType,
          listPrice: listing.price,
          daysOnMarket: listing.daysOnMarket,
          priceChanges: (listing as any).priceChanges,
          skipAVM: true,
        });
      } catch (e) {
        console.error('[deal-sourcing/bootstrap] listing failed', listing?.id, e);
        return null;
      }
    }, 5);

    const validListingRows = listingResults.filter(Boolean) as NonNullable<(typeof listingResults)[0]>[];
    // Deduplicate by rentcast_property_id — RentCast may return the same property multiple times
    const dedupedListingRows = [...new Map(validListingRows.map((r) => [r.rentcast_property_id, r])).values()];
    if (dedupedListingRows.length > 0) {
      const { error } = await supabaseAdmin.from('properties').upsert(dedupedListingRows, { onConflict: 'rentcast_property_id' });
      if (error) throw error;
    }
    processed = dedupedListingRows.length;
    return NextResponse.json({ success: true, zip, processed, source: 'sale_listings' });
  } catch (e) {
    console.error('[deal-sourcing/bootstrap] error', e);
    const msg = e instanceof Error ? e.message : 'Failed to bootstrap zip';
    const isTimeout =
      typeof msg === 'string' &&
      (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('fetch failed'));
    return NextResponse.json(
      { error: isTimeout ? 'RentCast is unreachable (network timeout). Try again or check network/DNS/VPN/firewall.' : msg },
      { status: isTimeout ? 502 : 500 },
    );
  }
}

