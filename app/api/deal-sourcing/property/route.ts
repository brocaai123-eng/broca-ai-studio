import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAVMValueByAddress, getPropertyByAddress } from '@/lib/services/rentcast';
import { computeMotivatedSellerScore } from '@/lib/services/motivated-seller';
import { fetchExternalDealSignals } from '@/lib/services/deal-sourcing-external';
import { retryOnce, withTimeout } from '@/lib/utils/with-timeout';

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeAddress(a: string) {
  return a.trim().replace(/\s+/g, ' ');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = normalizeAddress(searchParams.get('address') || '');
    if (!address) return NextResponse.json({ error: 'address is required' }, { status: 400 });

    // 1) Check cache
    const { data: cached, error: cacheErr } = await retryOnce(() =>
      withTimeout(
        supabase
          .from('properties')
          .select('*')
          .eq('formatted_address', address)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        12000,
        'Deal sourcing property cache query',
      ),
    );
    if (cacheErr) console.warn('[deal-sourcing/property] cache read error', cacheErr);

    // If fresh enough (24h), return it
    if (cached?.updated_at) {
      const ageMs = Date.now() - new Date(cached.updated_at).getTime();
      if (!Number.isNaN(ageMs) && ageMs < 24 * 60 * 60 * 1000) {
        return NextResponse.json({
          property: cached,
          cached: true,
          signal_sources: null,
        });
      }
    }

    // 2) Fetch from RentCast (real)
    const record = await getPropertyByAddress(address);
    if (!record) return NextResponse.json({ error: 'Property not found in RentCast' }, { status: 404 });

    const avm = await getAVMValueByAddress(record.formattedAddress || address);

    const external = await fetchExternalDealSignals({
      formattedAddress: record.formattedAddress || address,
      zip: record.zipCode ?? null,
      city: record.city ?? null,
      state: record.state ?? null,
      assessorId: record.assessorID ?? null,
      latitude: record.latitude ?? null,
      longitude: record.longitude ?? null,
    });

    const ms = computeMotivatedSellerScore({
      ownerOccupied: record.ownerOccupied ?? null,
      lastSaleDate: record.lastSaleDate ?? null,
      lastSalePrice: record.lastSalePrice ?? null,
      listPrice: null,
      avmPrice: avm?.price ?? null,
      daysOnMarket: null,
      extendedDomFlag: cached?.extended_dom ?? null,
      foreclosure_case: external.foreclosure_case,
      tax_delinquent: external.tax_delinquent,
      probate_case: external.probate_case,
      divorce_case: external.divorce_case,
      satellite_condition_flag: external.satellite_condition_flag,
      code_violations_count: external.code_violations_count,
    });

    const upsertRow = {
      rentcast_property_id: record.id,
      formatted_address: record.formattedAddress || address,
      address_line1: record.addressLine1 ?? null,
      address_line2: record.addressLine2 ?? null,
      city: record.city ?? null,
      state: record.state ?? null,
      zip: record.zipCode ?? null,
      latitude: record.latitude ?? null,
      longitude: record.longitude ?? null,
      bedrooms: record.bedrooms ?? null,
      bathrooms: record.bathrooms ?? null,
      square_footage: record.squareFootage ?? null,
      lot_size: record.lotSize ?? null,
      year_built: record.yearBuilt ?? null,
      property_type: record.propertyType ?? null,
      zoning: record.zoning ?? null,
      assessor_id: record.assessorID ?? null,
      owner_names: record.owner?.names ?? [],
      owner_mailing_address: record.owner?.mailingAddress ?? null,
      owner_occupied: record.ownerOccupied ?? null,
      last_sale_date: record.lastSaleDate ? new Date(record.lastSaleDate).toISOString() : null,
      last_sale_price: record.lastSalePrice ?? null,
      estimated_value: avm?.price ?? null,
      estimated_value_low: avm?.priceRangeLow ?? null,
      estimated_value_high: avm?.priceRangeHigh ?? null,
      avm_last_updated_at: avm ? new Date().toISOString() : null,
      foreclosure_case: external.foreclosure_case,
      tax_delinquent: external.tax_delinquent,
      probate_case: external.probate_case,
      divorce_case: external.divorce_case,
      code_violations_count: external.code_violations_count,
      satellite_condition_flag: external.satellite_condition_flag,
      motivated_seller_score: ms.score,
      motivated_seller_label: ms.label,
      motivated_seller_breakdown: ms.breakdown,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error: saveErr } = await retryOnce(() =>
      withTimeout(
        supabase
          .from('properties')
          .upsert(upsertRow, { onConflict: 'rentcast_property_id' })
          .select('*')
          .single(),
        12000,
        'Deal sourcing property upsert',
      ),
    );
    if (saveErr) throw saveErr;

    return NextResponse.json({
      property: saved,
      cached: false,
      signal_sources: external.meta,
    });
  } catch (e) {
    console.error('[deal-sourcing/property] error', e);
    return NextResponse.json({ error: 'Failed to fetch property intelligence' }, { status: 500 });
  }
}
