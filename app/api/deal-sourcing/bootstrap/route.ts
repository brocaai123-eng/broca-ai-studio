import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { listSaleListingsByZip, listPropertiesByZip, getPropertyByAddress, getAVMValueByAddress } from '@/lib/services/rentcast';
import { computeMotivatedSellerScore } from '@/lib/services/motivated-seller';
import { retryWithBackoff, withTimeout } from '@/lib/utils/with-timeout';

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
    const limit = Math.min(50, Math.max(5, Number(body.limit || 25)));
    if (!zip || !/^\d{5}$/.test(zip)) {
      return NextResponse.json({ error: 'zip is required (5 digits)' }, { status: 400 });
    }

    // Pull a small set of real listings to populate the finder quickly.
    // If RentCast connectivity is flaky, backoff retries help avoid immediate failure.
    const listings = await retryWithBackoff(
      () => withTimeout(listSaleListingsByZip(zip, limit, 0), 90000, 'RentCast listings'),
      { attempts: 4, baseDelayMs: 500, maxDelayMs: 4000 },
    );

    let processed = 0;

    // If there are no active sale listings for this ZIP, fall back to property records in the zip
    // so the Finder isn't empty.
    if (!listings || listings.length === 0) {
      const props = await retryWithBackoff(
        () => withTimeout(listPropertiesByZip(zip, limit, 0), 90000, 'RentCast properties by zip'),
        { attempts: 4, baseDelayMs: 500, maxDelayMs: 4000 },
      );

      for (const p of props) {
        try {
          const address = p.formattedAddress;
          const avm = await getAVMValueByAddress(address);
          const ms = computeMotivatedSellerScore({
            ownerOccupied: p.ownerOccupied ?? null,
            lastSaleDate: p.lastSaleDate ?? null,
            lastSalePrice: p.lastSalePrice ?? null,
            listPrice: null,
            avmPrice: avm?.price ?? null,
            daysOnMarket: null,
            extendedDomFlag: false,
            foreclosure_case: null,
            tax_delinquent: null,
            probate_case: null,
            divorce_case: null,
            satellite_condition_flag: null,
            code_violations_count: null,
          });

          const row = {
            rentcast_property_id: p.id,
            formatted_address: address,
            address_line1: p.addressLine1 ?? null,
            address_line2: p.addressLine2 ?? null,
            city: p.city ?? null,
            state: p.state ?? null,
            zip: p.zipCode ?? zip,
            latitude: p.latitude ?? null,
            longitude: p.longitude ?? null,
            bedrooms: p.bedrooms ?? null,
            bathrooms: p.bathrooms ?? null,
            square_footage: p.squareFootage ?? null,
            lot_size: p.lotSize ?? null,
            year_built: p.yearBuilt ?? null,
            property_type: p.propertyType ?? null,
            zoning: p.zoning ?? null,
            assessor_id: p.assessorID ?? null,
            owner_names: p.owner?.names ?? [],
            owner_mailing_address: p.owner?.mailingAddress ?? null,
            owner_occupied: p.ownerOccupied ?? null,
            last_sale_date: p.lastSaleDate ? new Date(p.lastSaleDate).toISOString() : null,
            last_sale_price: p.lastSalePrice ?? null,
            estimated_value: avm?.price ?? null,
            estimated_value_low: avm?.priceRangeLow ?? null,
            estimated_value_high: avm?.priceRangeHigh ?? null,
            avm_last_updated_at: avm ? new Date().toISOString() : null,
            motivated_seller_score: ms.score,
            motivated_seller_label: ms.label,
            motivated_seller_breakdown: ms.breakdown,
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabaseAdmin.from('properties').upsert(row, { onConflict: 'rentcast_property_id' });
          if (error) throw error;
          processed++;
        } catch (e) {
          console.error('[deal-sourcing/bootstrap] property failed', p?.id, e);
        }
      }

      return NextResponse.json({ success: true, zip, processed, source: 'properties' });
    }

    for (const listing of listings) {
      try {
        const address = listing.formattedAddress;
        let record: Awaited<ReturnType<typeof getPropertyByAddress>> = null;
        try {
          record = await retryWithBackoff(
            () => withTimeout(getPropertyByAddress(address), 90000, 'RentCast property record'),
            { attempts: 2, baseDelayMs: 1500, maxDelayMs: 8000 },
          );
        } catch (e) {
          console.warn('[deal-sourcing/bootstrap] getPropertyByAddress failed, using listing fields only', listing?.id, e);
        }

        let avm: Awaited<ReturnType<typeof getAVMValueByAddress>> = null;
        try {
          avm = await retryWithBackoff(
            () => withTimeout(getAVMValueByAddress(address), 90000, 'RentCast AVM'),
            { attempts: 2, baseDelayMs: 1500, maxDelayMs: 8000 },
          );
        } catch (e) {
          console.warn('[deal-sourcing/bootstrap] AVM failed, continuing without AVM', listing?.id, e);
        }

        const dom = listing.daysOnMarket ?? null;
        const ms = computeMotivatedSellerScore({
          ownerOccupied: record?.ownerOccupied ?? null,
          lastSaleDate: record?.lastSaleDate ?? null,
          lastSalePrice: record?.lastSalePrice ?? null,
          listPrice: listing.price ?? null,
          avmPrice: avm?.price ?? null,
          daysOnMarket: dom,
          extendedDomFlag: (dom ?? 0) >= 180,
          foreclosure_case: null,
          tax_delinquent: null,
          probate_case: null,
          divorce_case: null,
          satellite_condition_flag: null,
          code_violations_count: null,
        });

        const row = {
          rentcast_property_id: record?.id ?? listing.id,
          formatted_address: address,
          address_line1: listing.addressLine1 ?? record?.addressLine1 ?? null,
          address_line2: listing.addressLine2 ?? record?.addressLine2 ?? null,
          city: listing.city ?? record?.city ?? null,
          state: listing.state ?? record?.state ?? null,
          zip: listing.zipCode ?? record?.zipCode ?? zip,
          latitude: listing.latitude ?? record?.latitude ?? null,
          longitude: listing.longitude ?? record?.longitude ?? null,
          bedrooms: listing.bedrooms ?? record?.bedrooms ?? null,
          bathrooms: listing.bathrooms ?? record?.bathrooms ?? null,
          square_footage: listing.squareFootage ?? record?.squareFootage ?? null,
          year_built: listing.yearBuilt ?? record?.yearBuilt ?? null,
          property_type: listing.propertyType ?? record?.propertyType ?? null,
          last_sale_date: record?.lastSaleDate ? new Date(record.lastSaleDate).toISOString() : null,
          last_sale_price: record?.lastSalePrice ?? null,
          owner_names: record?.owner?.names ?? [],
          owner_mailing_address: record?.owner?.mailingAddress ?? null,
          owner_occupied: record?.ownerOccupied ?? null,
          estimated_value: avm?.price ?? null,
          estimated_value_low: avm?.priceRangeLow ?? null,
          estimated_value_high: avm?.priceRangeHigh ?? null,
          avm_last_updated_at: avm ? new Date().toISOString() : null,
          extended_dom: (listing.daysOnMarket ?? 0) >= 180,
          below_value: avm?.price != null && listing.price != null ? listing.price <= avm.price * 0.9 : null,
          motivated_seller_score: ms.score,
          motivated_seller_label: ms.label,
          motivated_seller_breakdown: ms.breakdown,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabaseAdmin.from('properties').upsert(row, { onConflict: 'rentcast_property_id' });
        if (error) throw error;
        processed++;
      } catch (e) {
        console.error('[deal-sourcing/bootstrap] listing failed', listing?.id, e);
      }
    }

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

