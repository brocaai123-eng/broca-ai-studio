import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const zip = searchParams.get('zip');
    const signalType = searchParams.get('signal_type');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('deal_sourcing_signals')
      .select('*', { count: 'exact' });

    if (zip) {
      query = query.eq('zip', zip);
    }

    if (signalType) {
      query = query.eq('signal_type', signalType);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: signals, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      signals: signals || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Deal sourcing GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch deal sourcing signals' }, { status: 500 });
  }
}
