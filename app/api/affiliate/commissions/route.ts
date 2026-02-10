import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch affiliate commissions
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
      .from('affiliate_commissions')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .order('period_start', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: commissions, error } = await query;

    if (error) {
      console.error('Error fetching commissions:', error);
      return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 });
    }

    // Calculate summary
    const allCommissions = commissions || [];
    const summary = {
      current_balance: allCommissions
        .filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + Number(c.commission_amount), 0),
      pending_balance: allCommissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + Number(c.commission_amount), 0),
      total_paid: 0, // Will be fetched from payouts
      total_earned: allCommissions
        .filter(c => ['approved', 'paid'].includes(c.status))
        .reduce((sum, c) => sum + Number(c.commission_amount), 0),
    };

    // Get total paid from payouts
    const { data: payouts } = await supabase
      .from('affiliate_payouts')
      .select('amount')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'completed');

    summary.total_paid = (payouts || []).reduce((sum, p) => sum + Number(p.amount), 0);

    return NextResponse.json({ commissions: allCommissions, summary });
  } catch (error) {
    console.error('Error in GET /api/affiliate/commissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
