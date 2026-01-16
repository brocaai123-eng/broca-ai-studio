import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendSubscriptionConfirmationEmail } from '@/lib/email/resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // For testing without webhook signature
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const planId = session.metadata?.plan_id;
  const invitationToken = session.metadata?.invitation_token;
  const purchaseType = session.metadata?.type;
  const tokensPurchased = session.metadata?.tokens;

  // Handle token purchase (one-time payment)
  if (purchaseType === 'token_purchase' && userId && tokensPurchased) {
    const tokensToAdd = parseInt(tokensPurchased, 10);
    console.log(`Processing token purchase: ${tokensToAdd} tokens for user ${userId}`);
    
    // Add tokens to the user's balance
    const { data: subscription } = await supabase
      .from('broker_subscriptions')
      .select('tokens_remaining')
      .eq('broker_id', userId)
      .single();

    if (subscription) {
      const newBalance = (subscription.tokens_remaining || 0) + tokensToAdd;
      
      await supabase
        .from('broker_subscriptions')
        .update({ tokens_remaining: newBalance })
        .eq('broker_id', userId);

      // Log the token transaction
      await supabase
        .from('token_transactions')
        .insert({
          broker_id: userId,
          action_type: 'purchase',
          description: `Purchased ${tokensToAdd} tokens`,
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

      console.log(`Token purchase completed: ${tokensToAdd} tokens added to user ${userId}`);
    }
    return;
  }

  // Handle subscription checkout
  if (!userId || !planId) {
    console.error('Missing user_id or plan_id in session metadata');
    return;
  }

  // Get plan details
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (!plan) {
    console.error('Plan not found:', planId);
    return;
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
    return;
  }

  // Update broker profile with Stripe customer ID and subscription status
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      stripe_customer_id: session.customer as string,
    })
    .eq('id', userId);

  if (profileError) {
    console.error('Failed to update profile:', profileError);
  }

  // Update invitation status if token provided
  if (invitationToken) {
    await supabase
      .from('broker_invitations')
      .update({ status: 'accepted' })
      .eq('invitation_token', invitationToken);
  }

  // Record platform transaction
  await supabase
    .from('platform_transactions')
    .insert({
      type: 'subscription',
      amount: plan.price,
      broker_id: userId,
      description: `${plan.name} subscription payment`,
      stripe_payment_id: session.payment_intent as string,
    });

  // Send confirmation email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (profile?.email) {
    try {
      await sendSubscriptionConfirmationEmail({
        to: profile.email,
        brokerName: profile.full_name || 'Broker',
        planName: plan.name,
        tokensAllocated: plan.tokens_per_month,
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }
  }

  console.log(`Subscription activated for user ${userId} with plan ${plan.name}`);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);
  // Most logic handled in checkout.session.completed
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Find the broker subscription by Stripe subscription ID
  const { data: brokerSub } = await supabase
    .from('broker_subscriptions')
    .select('broker_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!brokerSub) return;

  // Update status based on Stripe status
  let status = 'active';
  if (subscription.status === 'past_due') status = 'past_due';
  if (subscription.status === 'canceled') status = 'cancelled';
  if (subscription.status === 'unpaid') status = 'suspended';

  // Get period dates from subscription items
  const periodStart = subscription.items?.data?.[0]?.current_period_start;
  const periodEnd = subscription.items?.data?.[0]?.current_period_end;

  const updateData: Record<string, unknown> = { status };
  if (periodStart) updateData.current_period_start = new Date(periodStart * 1000).toISOString();
  if (periodEnd) updateData.current_period_end = new Date(periodEnd * 1000).toISOString();

  await supabase
    .from('broker_subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', subscription.id);

  console.log(`Subscription updated: ${subscription.id}, status: ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabase
    .from('broker_subscriptions')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subscription.id);

  console.log(`Subscription cancelled: ${subscription.id}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // In newer Stripe API, subscription is accessed via parent
  const subscriptionId = (invoice as unknown as { subscription?: string | { id: string } }).subscription;
  const subId = typeof subscriptionId === 'string' 
    ? subscriptionId 
    : subscriptionId?.id;
  
  if (!subId) return;

  // Get broker subscription
  const { data: brokerSub } = await supabase
    .from('broker_subscriptions')
    .select('broker_id, plan:subscription_plans(tokens_per_month)')
    .eq('stripe_subscription_id', subId)
    .single();

  if (!brokerSub) return;

  // Reset tokens for new billing period
  const plan = brokerSub.plan as unknown as { tokens_per_month: number } | null;
  const tokensPerMonth = plan?.tokens_per_month || 0;

  await supabase
    .from('broker_subscriptions')
    .update({
      tokens_remaining: tokensPerMonth,
      status: 'active',
    })
    .eq('stripe_subscription_id', subId);

  // Record transaction
  const paymentIntent = (invoice as unknown as { payment_intent?: string | { id: string } }).payment_intent;
  const paymentIntentId = typeof paymentIntent === 'string'
    ? paymentIntent
    : paymentIntent?.id;

  await supabase
    .from('platform_transactions')
    .insert({
      type: 'subscription',
      amount: (invoice.amount_paid || 0) / 100,
      broker_id: brokerSub.broker_id,
      description: 'Monthly subscription renewal',
      stripe_payment_id: paymentIntentId || null,
    });

  console.log(`Payment succeeded for subscription: ${subId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as unknown as { subscription?: string | { id: string } }).subscription;
  const subId = typeof subscriptionId === 'string' 
    ? subscriptionId 
    : subscriptionId?.id;
    
  if (!subId) return;

  await supabase
    .from('broker_subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subId);

  console.log(`Payment failed for subscription: ${subId}`);
}
