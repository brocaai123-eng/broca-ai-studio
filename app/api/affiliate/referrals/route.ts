import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch affiliate referrals
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const status = request.nextUrl.searchParams.get('status');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get affiliate ID
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (affError || !affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    }

    let query = supabase
      .from('affiliate_referrals')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: referrals, error } = await query;

    if (error) {
      console.error('Error fetching referrals:', error);
      return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 });
    }

    return NextResponse.json({ referrals: referrals || [] });
  } catch (error) {
    console.error('Error in GET /api/affiliate/referrals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
