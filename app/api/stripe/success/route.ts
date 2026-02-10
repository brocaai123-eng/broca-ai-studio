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
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const userId = session.metadata?.user_id;
    const planId = session.metadata?.plan_id;
    const invitationToken = session.metadata?.invitation_token;

    if (!userId || !planId) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    // Check if subscription already exists
    const { data: existingSub } = await supabase
      .from('broker_subscriptions')
      .select('id')
      .eq('broker_id', userId)
      .eq('status', 'active')
      .single();

    if (existingSub) {
      return NextResponse.json({ success: true, message: 'Subscription already exists' });
    }

    // Get plan details
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Create broker subscription (stripe_customer_id is stored in profiles, not broker_subscriptions)
    const { error: subscriptionError } = await supabase
      .from('broker_subscriptions')
      .upsert({
        broker_id: userId,
        plan_id: planId,
        status: 'active',
        stripe_subscription_id: session.subscription as string,
        tokens_remaining: plan.tokens_per_month,
        tokens_used: 0,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, {
        onConflict: 'broker_id',
      });

    if (subscriptionError) {
      console.error('Failed to create subscription:', subscriptionError);
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }

    // Update broker profile with Stripe customer ID
    await supabase
      .from('profiles')
      .update({
        stripe_customer_id: session.customer as string,
      })
      .eq('id', userId);

    // Update invitation status if token provided
    if (invitationToken) {
      await supabase
        .from('broker_invitations')
        .update({ status: 'accepted' })
        .eq('invitation_token', invitationToken);
    }

    // Track affiliate conversion if affiliate code provided
    const affiliateCode = session.metadata?.affiliate_code;
    if (affiliateCode) {
      try {
        // Get the user's email for the referral record
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single();

        // Get the affiliate
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('id, commission_rate')
          .eq('referral_code', affiliateCode.toUpperCase())
          .eq('status', 'active')
          .single();

        if (affiliate && userProfile) {
          const commissionRate = affiliate.commission_rate || 25;
          const monthlyCommission = plan.price * (commissionRate / 100);

          // Check if referral already exists (from click/signup tracking)
          const { data: existingRef } = await supabase
            .from('affiliate_referrals')
            .select('id')
            .eq('affiliate_id', affiliate.id)
            .eq('referred_email', userProfile.email.toLowerCase())
            .maybeSingle();

          if (existingRef) {
            // Update existing referral to active with plan info
            await supabase
              .from('affiliate_referrals')
              .update({
                status: 'active',
                referred_user_id: userId,
                plan_name: plan.name,
                plan_price: plan.price,
                mrr: plan.price,
                commission_rate: commissionRate,
                monthly_commission: monthlyCommission,
                activated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingRef.id);
          } else {
            // Create a new referral record
            await supabase
              .from('affiliate_referrals')
              .insert({
                affiliate_id: affiliate.id,
                referred_user_id: userId,
                referred_email: userProfile.email.toLowerCase(),
                referred_name: userProfile.full_name || null,
                status: 'active',
                plan_name: plan.name,
                plan_price: plan.price,
                mrr: plan.price,
                commission_rate: commissionRate,
                monthly_commission: monthlyCommission,
                activated_at: new Date().toISOString(),
              });
          }

          // Create initial commission record
          const now = new Date();
          const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          await supabase
            .from('affiliate_commissions')
            .insert({
              affiliate_id: affiliate.id,
              period_start: now.toISOString().split('T')[0],
              period_end: periodEnd.toISOString().split('T')[0],
              referred_email: userProfile.email.toLowerCase(),
              plan_name: plan.name,
              mrr_amount: plan.price,
              commission_rate: commissionRate,
              commission_amount: monthlyCommission,
              status: 'approved',
            });

          console.log(`Affiliate conversion tracked: ${affiliateCode} earned $${monthlyCommission.toFixed(2)} from ${userProfile.email}`);
        }
      } catch (affError) {
        console.error('Failed to track affiliate conversion:', affError);
        // Non-critical — don't fail the success handler
      }
    }

    console.log(`Subscription activated for user ${userId} with plan ${plan.name}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Success handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
