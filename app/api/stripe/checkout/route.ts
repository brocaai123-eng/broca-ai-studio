import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const { planId, userId, invitationToken, isUpgrade, affiliateCode } = await request.json();

    console.log('Checkout request:', { planId, userId, invitationToken, isUpgrade, affiliateCode });

    if (!planId || !userId) {
      return NextResponse.json({ error: 'Plan ID and User ID are required' }, { status: 400 });
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      console.error('Plan not found:', planError);
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Get user details from profiles table
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, stripe_customer_id')
      .eq('id', userId)
      .single();

    // If profile doesn't exist, get user from Supabase Auth and create profile
    if (profileError || !profile) {
      console.log('Profile not found, checking Supabase Auth...');
      
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      
      if (authError || !authUser.user) {
        console.error('User not found in auth:', authError);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Create profile for the user
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: authUser.user.email,
          full_name: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0],
          role: 'broker',
        })
        .select('email, full_name, stripe_customer_id')
        .single();

      if (createError) {
        console.error('Failed to create profile:', createError);
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
      }

      profile = newProfile;
      console.log('Created new profile:', profile);
    }

    // Check if user already has active subscription
    const { data: existingSubscription } = await supabase
      .from('broker_subscriptions')
      .select('id, status, stripe_subscription_id')
      .eq('broker_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    // If user has active subscription and this is NOT an upgrade request, block
    if (existingSubscription && !isUpgrade) {
      return NextResponse.json({ error: 'User already has an active subscription' }, { status: 409 });
    }

    // If this is an upgrade and user has existing subscription, we need to handle differently
    // For upgrades, we'll use Stripe's subscription update or create a new checkout for upgrade
    if (existingSubscription && isUpgrade && existingSubscription.stripe_subscription_id) {
      // For now, we'll cancel the old subscription and create new one via checkout
      // In production, you might want to use stripe.subscriptions.update for prorated upgrades
      try {
        await stripe.subscriptions.cancel(existingSubscription.stripe_subscription_id, {
          prorate: true,
        });
        
        // Update local subscription status
        await supabase
          .from('broker_subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', existingSubscription.id);
      } catch (cancelError) {
        console.log('Could not cancel existing subscription:', cancelError);
        // Continue anyway - user might have cancelled manually
      }
    }

    // Create or get Stripe customer
    let customerId: string;
    
    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name || undefined,
        metadata: {
          user_id: userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create Stripe checkout session
    const successUrl = isUpgrade 
      ? `${APP_URL}/dashboard/subscription?upgrade=success&session_id={CHECKOUT_SESSION_ID}`
      : `${APP_URL}/dashboard?subscription=success&session_id={CHECKOUT_SESSION_ID}`;
    
    const cancelUrl = isUpgrade
      ? `${APP_URL}/dashboard/subscription?upgrade=cancelled`
      : `${APP_URL}/signup?subscription=cancelled${invitationToken ? `&invitation=${invitationToken}` : ''}&step=plan`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.name} Plan`,
              description: plan.description || `${plan.tokens_per_month === -1 ? 'Unlimited' : plan.tokens_per_month} tokens per month`,
            },
            unit_amount: Math.round(plan.price * 100), // Convert to cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId,
        plan_id: planId,
        invitation_token: invitationToken || '',
        affiliate_code: affiliateCode || '',
      },
    });

    console.log('Checkout session created:', session.id);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
