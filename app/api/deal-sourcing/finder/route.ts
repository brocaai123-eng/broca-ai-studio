import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { retryOnce, withTimeout } from '@/lib/utils/with-timeout';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zip = (searchParams.get('zip') || '').trim();
    const minScore = Number(searchParams.get('minScore') || 0);
    const type = (searchParams.get('type') || 'all').trim();
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;
    const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') || 100)));

    if (!zip || !/^\d{5}$/.test(zip)) {
      return NextResponse.json({ error: 'zip is required (5 digits)' }, { status: 400 });
    }

    let q = supabase
      .from('properties')
      .select(
        'id, formatted_address, city, state, zip, bedrooms, bathrooms, square_footage, property_type, latitude, longitude, owner_occupied, last_sale_date, last_sale_price, estimated_value, motivated_seller_score, motivated_seller_label, motivated_seller_breakdown, code_violations_count, updated_at',
      )
      .eq('zip', zip)
      .gte('motivated_seller_score', Number.isFinite(minScore) ? minScore : 0)
      .order('motivated_seller_score', { ascending: false })
      .limit(limit);

    if (type !== 'all') {
      q = q.eq('property_type', type);
    }

    if (maxPrice != null && Number.isFinite(maxPrice)) {
      // prefer listed price if you later store it; for now filter by estimated_value as a proxy
      q = q.lte('estimated_value', maxPrice);
    }

    const result = await retryOnce(() =>
      withTimeout(q.throwOnError(), 12000, 'Deal sourcing finder query')
    ) as any;
    const data = result?.data ?? [];

    return NextResponse.json({
      zip,
      showing: data?.length ?? 0,
      properties: data ?? [],
    });
  } catch (e) {
    console.error('[deal-sourcing/finder] error', e);
    return NextResponse.json({ error: 'Failed to fetch motivated sellers' }, { status: 500 });
  }
}

