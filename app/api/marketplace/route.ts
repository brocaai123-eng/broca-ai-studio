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

    const assetType = searchParams.get('asset_type');
    const search = searchParams.get('search');
    const priceMin = searchParams.get('price_min');
    const priceMax = searchParams.get('price_max');
    const ariaScoreMin = searchParams.get('aria_score_min');
    const belowMarketMin = searchParams.get('below_market_min');
    const datePosted = searchParams.get('date_posted');
    const sortBy = searchParams.get('sort_by') || 'newest';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('marketplace_listings')
      .select('*, broker:profiles!marketplace_listings_broker_id_fkey(*)', { count: 'exact' })
      .eq('status', 'live');

    if (assetType) {
      query = query.eq('asset_type', assetType);
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,location_city.ilike.%${search}%,location_state.ilike.%${search}%`
      );
    }

    if (priceMin) {
      query = query.gte('asking_price', parseInt(priceMin, 10));
    }

    if (priceMax) {
      query = query.lte('asking_price', parseInt(priceMax, 10));
    }

    if (ariaScoreMin) {
      query = query.gte('aria_score', parseInt(ariaScoreMin, 10));
    }

    if (belowMarketMin) {
      query = query.gte('below_market_pct', parseFloat(belowMarketMin));
    }

    if (datePosted) {
      const now = new Date();
      let since: Date;
      switch (datePosted) {
        case 'today':
          since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'this_week':
          since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'this_month':
          since = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          since = new Date(0);
      }
      query = query.gte('created_at', since.toISOString());
    }

    switch (sortBy) {
      case 'price_asc':
        query = query.order('asking_price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('asking_price', { ascending: false });
        break;
      case 'score_desc':
        query = query.order('aria_score', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data: listings, error, count } = await retryOnce(() =>
      withTimeout(query, 12000, 'Marketplace listings query')
    );

    if (error) throw error;

    return NextResponse.json({
      listings: listings || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Marketplace GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }
}
