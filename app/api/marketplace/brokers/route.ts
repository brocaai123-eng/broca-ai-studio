import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search');
    const specialty = searchParams.get('specialty');
    const sortBy = searchParams.get('sort_by') || 'top_rated';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('broker_profiles')
      .select('*, profile:profiles(full_name, avatar_url)', { count: 'exact' });

    if (search) {
      query = query.or(
        `company_name.ilike.%${search}%,bio.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`
      );
    }

    if (specialty) {
      query = query.contains('specialties', [specialty]);
    }

    switch (sortBy) {
      case 'most_listings':
        query = query.order('total_listings', { ascending: false });
        break;
      case 'fastest_close':
        query = query.order('avg_days_to_close', { ascending: true });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'top_rated':
      default:
        query = query.order('rating', { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data: brokers, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      brokers: brokers || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Brokers GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch brokers' }, { status: 500 });
  }
}
