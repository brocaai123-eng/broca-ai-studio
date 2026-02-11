import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch affiliate profile and stats
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Fetch affiliate profile
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (affiliateError || !affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    }

    // Fetch stats using RPC
    const { data: stats, error: statsError } = await supabase
      .rpc('get_affiliate_stats', { affiliate_uuid: affiliate.id });

    if (statsError) {
      console.error('Error fetching affiliate stats:', statsError);
    }

    const statsData = Array.isArray(stats) ? stats[0] : stats;

    return NextResponse.json({
      affiliate,
      stats: statsData || {
        active_referrals: 0,
        total_referrals: 0,
        monthly_commission: 0,
        lifetime_earned: 0,
        pending_balance: 0,
        paid_balance: 0,
        conversion_rate: 0,
        total_clicks: 0,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/affiliate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update affiliate profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...updates } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Only allow updating certain fields
    const allowedFields = ['full_name', 'phone', 'company', 'payout_method', 'payout_email', 'bio', 'website'];
    const filteredUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        // Don't save empty strings for payout_method (DB has check constraint)
        if (key === 'payout_method' && (!updates[key] || updates[key] === '')) {
          filteredUpdates[key] = null;
        } else {
          filteredUpdates[key] = updates[key];
        }
      }
    }
    filteredUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('affiliates')
      .update(filteredUpdates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating affiliate:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ affiliate: data });
  } catch (error) {
    console.error('Error in PUT /api/affiliate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
