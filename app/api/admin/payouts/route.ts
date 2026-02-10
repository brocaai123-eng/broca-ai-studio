import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch all affiliate payouts (admin)
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const status = request.nextUrl.searchParams.get('status');

    // Verify admin
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch all payouts with affiliate info
    let query = supabase
      .from('affiliate_payouts')
      .select(`
        *,
        affiliate:affiliates(id, full_name, email, payout_method, payout_email, stripe_connect_id)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: payouts, error } = await query;

    if (error) {
      console.error('Error fetching admin payouts:', error);
      return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
    }

    // Get summary stats
    const allPayouts = payouts || [];
    const pendingAmount = allPayouts
      .filter(p => p.status === 'pending')
      .reduce((s, p) => s + Number(p.amount), 0);
    const processingAmount = allPayouts
      .filter(p => p.status === 'processing')
      .reduce((s, p) => s + Number(p.amount), 0);
    const completedAmount = allPayouts
      .filter(p => p.status === 'completed')
      .reduce((s, p) => s + Number(p.amount), 0);

    return NextResponse.json({
      payouts: allPayouts,
      stats: {
        pending_count: allPayouts.filter(p => p.status === 'pending').length,
        pending_amount: pendingAmount,
        processing_count: allPayouts.filter(p => p.status === 'processing').length,
        processing_amount: processingAmount,
        completed_count: allPayouts.filter(p => p.status === 'completed').length,
        completed_amount: completedAmount,
        total_count: allPayouts.length,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/payouts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update payout status (approve, process, complete, fail)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, payoutId, action, notes } = body;

    // Verify admin
    if (!userId || !payoutId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get the payout with affiliate info
    const { data: payout, error: payoutError } = await supabase
      .from('affiliate_payouts')
      .select(`
        *,
        affiliate:affiliates(id, full_name, email, payout_method, payout_email, stripe_connect_id)
      `)
      .eq('id', payoutId)
      .single();

    if (payoutError || !payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    const affiliate = payout.affiliate as any;

    // Handle different actions
    switch (action) {
      case 'approve': {
        // Move from pending to processing
        await supabase
          .from('affiliate_payouts')
          .update({
            status: 'processing',
            notes: notes || 'Approved by admin',
          })
          .eq('id', payoutId);

        return NextResponse.json({ success: true, message: 'Payout approved and moved to processing' });
      }

      case 'process_stripe': {
        // Auto-payout via Stripe transfer to connected account
        if (!affiliate?.stripe_connect_id) {
          return NextResponse.json(
            { error: 'Affiliate has no Stripe Connect account. Use manual payout instead.' },
            { status: 400 }
          );
        }

        try {
          // Create a Stripe transfer to the connected account
          const transfer = await stripe.transfers.create({
            amount: Math.round(Number(payout.amount) * 100), // cents
            currency: 'usd',
            destination: affiliate.stripe_connect_id,
            description: `Affiliate payout to ${affiliate.full_name} (${affiliate.email})`,
            metadata: {
              payout_id: payoutId,
              affiliate_id: affiliate.id,
            },
          });

          // Update payout as completed
          await supabase
            .from('affiliate_payouts')
            .update({
              status: 'completed',
              payout_reference: transfer.id,
              paid_at: new Date().toISOString(),
              notes: notes || `Auto-payout via Stripe transfer ${transfer.id}`,
            })
            .eq('id', payoutId);

          // Mark associated commissions as paid
          await supabase
            .from('affiliate_commissions')
            .update({ status: 'paid' })
            .eq('affiliate_id', payout.affiliate_id)
            .eq('status', 'approved');

          return NextResponse.json({
            success: true,
            message: `$${Number(payout.amount).toFixed(2)} transferred to ${affiliate.full_name} via Stripe`,
            transfer_id: transfer.id,
          });
        } catch (stripeError: any) {
          console.error('Stripe transfer failed:', stripeError);

          await supabase
            .from('affiliate_payouts')
            .update({
              status: 'failed',
              notes: `Stripe transfer failed: ${stripeError.message}`,
            })
            .eq('id', payoutId);

          return NextResponse.json(
            { error: `Stripe transfer failed: ${stripeError.message}` },
            { status: 500 }
          );
        }
      }

      case 'mark_paid': {
        // Manual mark as paid (for PayPal, bank transfer, etc.)
        await supabase
          .from('affiliate_payouts')
          .update({
            status: 'completed',
            paid_at: new Date().toISOString(),
            payout_reference: notes || 'Manual payment',
            notes: notes || 'Manually marked as paid by admin',
          })
          .eq('id', payoutId);

        // Mark associated commissions as paid
        await supabase
          .from('affiliate_commissions')
          .update({ status: 'paid' })
          .eq('affiliate_id', payout.affiliate_id)
          .eq('status', 'approved');

        return NextResponse.json({ success: true, message: 'Payout marked as completed' });
      }

      case 'reject': {
        await supabase
          .from('affiliate_payouts')
          .update({
            status: 'failed',
            notes: notes || 'Rejected by admin',
          })
          .eq('id', payoutId);

        return NextResponse.json({ success: true, message: 'Payout rejected' });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in PUT /api/admin/payouts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
