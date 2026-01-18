import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json();

    if (!sessionId || !userId) {
      return NextResponse.json({ error: 'Session ID and User ID are required' }, { status: 400 });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify it's a token purchase and matches the user
    if (session.metadata?.type !== 'token_purchase') {
      return NextResponse.json({ error: 'Invalid session type' }, { status: 400 });
    }

    if (session.metadata?.user_id !== userId) {
      return NextResponse.json({ error: 'User mismatch' }, { status: 403 });
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const tokensToAdd = parseInt(session.metadata.tokens, 10);

    // Check if this session was already processed (prevent double-adding)
    const { data: existingTransaction } = await supabase
      .from('token_transactions')
      .select('id')
      .eq('broker_id', userId)
      .eq('action_type', 'purchase')
      .ilike('description', `%${sessionId}%`)
      .single();

    if (existingTransaction) {
      // Already processed
      return NextResponse.json({ 
        success: true, 
        message: 'Already processed',
        tokens: tokensToAdd 
      });
    }

    // Check if tokens were already added by webhook (look for recent purchase transaction)
    const { data: recentPurchase } = await supabase
      .from('token_transactions')
      .select('id, created_at')
      .eq('broker_id', userId)
      .eq('action_type', 'purchase')
      .eq('tokens_amount', tokensToAdd)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Within last 5 minutes
      .single();

    if (recentPurchase) {
      // Likely already processed by webhook
      return NextResponse.json({ 
        success: true, 
        message: 'Already processed by webhook',
        tokens: tokensToAdd 
      });
    }

    // Add tokens to the user's balance
    const { data: subscription } = await supabase
      .from('broker_subscriptions')
      .select('tokens_remaining')
      .eq('broker_id', userId)
      .single();

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const newBalance = (subscription.tokens_remaining || 0) + tokensToAdd;

    // Update token balance
    await supabase
      .from('broker_subscriptions')
      .update({ tokens_remaining: newBalance })
      .eq('broker_id', userId);

    // Log the token transaction with session ID to prevent duplicates
    await supabase
      .from('token_transactions')
      .insert({
        broker_id: userId,
        action_type: 'purchase',
        description: `Purchased ${tokensToAdd} tokens (Session: ${sessionId.slice(-8)})`,
        tokens_amount: tokensToAdd,
        balance_after: newBalance,
      });

    // Record platform transaction
    await supabase
      .from('platform_transactions')
      .insert({
        type: 'token_purchase',
        amount: session.amount_total ? session.amount_total / 100 : 0,
        broker_id: userId,
        description: `Token purchase: ${tokensToAdd} tokens`,
        stripe_payment_id: session.payment_intent as string,
      });

    console.log(`Verified token purchase: ${tokensToAdd} tokens added to user ${userId}`);

    return NextResponse.json({
      success: true,
      tokens: tokensToAdd,
      newBalance,
    });
  } catch (error) {
    console.error('Verify purchase error:', error);
    return NextResponse.json({ error: 'Failed to verify purchase' }, { status: 500 });
  }
}
