import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { listSaleListingsByZip, getPropertyByAddress, getAVMValueByAddress } from '@/lib/services/rentcast';
import { computeMotivatedSellerScore } from '@/lib/services/motivated-seller';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Max ZIPs to refresh per cron run — keeps RentCast usage predictable
const MAX_ZIPS_PER_RUN = 20;

export async function GET(request: NextRequest) {
  if (process.env.ENABLE_DEAL_REFRESH_CRON !== 'true') {
    return NextResponse.json({ skipped: true, reason: 'ENABLE_DEAL_REFRESH_CRON is not true' });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only refresh ZIPs that users have actually searched (exist in our DB).
  // Order by oldest update so stale ZIPs get refreshed first.
  const { data: zipRows, error: zipErr } = await supabase
    .from('properties')
    .select('zip')
    .not('zip', 'is', null)
    .order('updated_at', { ascending: true })
    .limit(MAX_ZIPS_PER_RUN * 50); // fetch enough rows to extract distinct ZIPs

  if (zipErr) {
    console.error('[deal-sourcing-refresh] failed to load ZIPs', zipErr);
    return NextResponse.json({ error: 'Failed to load ZIPs from DB' }, { status: 500 });
  }

  // Deduplicate, preserving oldest-first order
  const seen = new Set<string>();
  const zipsToRefresh: string[] = [];
  for (const row of zipRows ?? []) {
    if (row.zip && !seen.has(row.zip)) {
      seen.add(row.zip);
      zipsToRefresh.push(row.zip);
      if (zipsToRefresh.length >= MAX_ZIPS_PER_RUN) break;
    }
  }

  if (zipsToRefresh.length === 0) {
    return NextResponse.json({ success: true, processed: 0, errors: 0, message: 'No ZIPs in DB yet', details: [] });
  }

  let processed = 0;
  let errors = 0;
  const details: Array<{ zip: string; processed: number; errors: number }> = [];

  for (const zip of zipsToRefresh) {
    let zipProcessed = 0;
    let zipErrors = 0;

    try {
      const listings = await listSaleListingsByZip(zip, 20, 0);

      for (const listing of listings) {
        try {
          const address = listing.formattedAddress;
          const record = await getPropertyByAddress(address);
          const avm = await getAVMValueByAddress(address);

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

          const { error } = await supabase.from('properties').upsert(row, { onConflict: 'rentcast_property_id' });
          if (error) throw error;

          processed++;
          zipProcessed++;
        } catch (e) {
          errors++;
          zipErrors++;
          console.error(`[deal-sourcing-refresh] failed listing ${listing.id} (${zip})`, e);
        }
      }
    } catch (e) {
      errors++;
      zipErrors++;
      console.error(`[deal-sourcing-refresh] failed zip ${zip}`, e);
    }

    details.push({ zip, processed: zipProcessed, errors: zipErrors });
  }

  return NextResponse.json({
    success: true,
    processed,
    errors,
    timestamp: new Date().toISOString(),
    details,
  });
}

