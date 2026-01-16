import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Token packages - must match the frontend
const tokenPackages: Record<string, { name: string; tokens: number; price: number }> = {
  basic: { name: "Basic", tokens: 100, price: 19 },
  standard: { name: "Standard", tokens: 500, price: 79 },
  premium: { name: "Premium", tokens: 1500, price: 199 },
};

export async function POST(request: NextRequest) {
  try {
    const { packageId, userId } = await request.json();

    console.log('Token purchase request:', { packageId, userId });

    if (!packageId || !userId) {
      return NextResponse.json({ error: 'Package ID and User ID are required' }, { status: 400 });
    }

    const tokenPackage = tokenPackages[packageId];
    if (!tokenPackage) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create or get Stripe customer
    let customerId: string;
    
    if (profile.stripe_customer_id) {
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

    // Create Stripe checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment', // One-time payment, not subscription
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${tokenPackage.name} Token Package`,
              description: `${tokenPackage.tokens} AI tokens for your BROCA account`,
            },
            unit_amount: Math.round(tokenPackage.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/dashboard/tokens?purchase=success&tokens=${tokenPackage.tokens}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/dashboard/tokens?purchase=cancelled`,
      metadata: {
        user_id: userId,
        package_id: packageId,
        tokens: tokenPackage.tokens.toString(),
        type: 'token_purchase',
      },
    });

    console.log('Token purchase checkout session created:', session.id);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Token purchase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
