import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch affiliate payouts
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get affiliate
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('id, minimum_payout, payout_method')
      .eq('user_id', userId)
      .single();

    if (affError || !affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    }

    const { data: payouts, error } = await supabase
      .from('affiliate_payouts')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payouts:', error);
      return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
    }

    // Get available balance (total earned minus completed/pending payouts)
    const { data: earnedCommissions } = await supabase
      .from('affiliate_commissions')
      .select('commission_amount')
      .eq('affiliate_id', affiliate.id)
      .in('status', ['approved', 'paid']);

    const totalEarned = (earnedCommissions || []).reduce(
      (sum, c) => sum + Number(c.commission_amount), 0
    );

    const totalCompletedPayouts = (payouts || [])
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalPendingPayouts = (payouts || [])
      .filter(p => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const availableBalance = totalEarned - totalCompletedPayouts - totalPendingPayouts;

    return NextResponse.json({
      payouts: payouts || [],
      available_balance: availableBalance,
      minimum_payout: affiliate.minimum_payout,
      payout_method: affiliate.payout_method,
    });
  } catch (error) {
    console.error('Error in GET /api/affiliate/payouts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Request a payout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount } = body;

    if (!userId || !amount) {
      return NextResponse.json({ error: 'User ID and amount are required' }, { status: 400 });
    }

    // Get affiliate
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('id, minimum_payout, payout_method, payout_email')
      .eq('user_id', userId)
      .single();

    if (affError || !affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    }

    // Check for Stripe Connect or manual payout method
    const { data: affFull } = await supabase
      .from('affiliates')
      .select('stripe_connect_id')
      .eq('user_id', userId)
      .single();

    if (!affiliate.payout_method && !affFull?.stripe_connect_id) {
      return NextResponse.json(
        { error: 'Please set up a payout method in your settings first' },
        { status: 400 }
      );
    }

    if (amount < affiliate.minimum_payout) {
      return NextResponse.json(
        { error: `Minimum payout amount is $${affiliate.minimum_payout}` },
        { status: 400 }
      );
    }

    // Get available balance (total earned minus all payouts)
    const { data: earnedComm } = await supabase
      .from('affiliate_commissions')
      .select('commission_amount')
      .eq('affiliate_id', affiliate.id)
      .in('status', ['approved', 'paid']);

    const { data: allPayouts } = await supabase
      .from('affiliate_payouts')
      .select('amount, status')
      .eq('affiliate_id', affiliate.id)
      .in('status', ['pending', 'processing', 'completed']);

    const totalEarned = (earnedComm || []).reduce((s, c) => s + Number(c.commission_amount), 0);
    const totalPayouts = (allPayouts || []).reduce((s, p) => s + Number(p.amount), 0);
    const available = totalEarned - totalPayouts;

    if (amount > available) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: $${available.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Create payout request
    const payoutMethod = affiliate.payout_method || (affFull?.stripe_connect_id ? 'stripe' : null);
    const { data: payout, error } = await supabase
      .from('affiliate_payouts')
      .insert({
        affiliate_id: affiliate.id,
        amount: amount,
        payout_method: payoutMethod,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payout:', error);
      return NextResponse.json({ error: 'Failed to create payout request' }, { status: 500 });
    }

    return NextResponse.json({ payout }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/affiliate/payouts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
