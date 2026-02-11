import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// POST - Create Stripe Connect onboarding link for an affiliate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get affiliate
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('id, email, full_name, stripe_connect_id')
      .eq('user_id', userId)
      .single();

    if (affError || !affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    }

    let connectAccountId = affiliate.stripe_connect_id;

    // Create a Connect account if one doesn't exist
    if (!connectAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: affiliate.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          affiliate_id: affiliate.id,
          user_id: userId,
        },
      });

      connectAccountId = account.id;

      // Save the Connect account ID and set payout method to stripe
      await supabase
        .from('affiliates')
        .update({ stripe_connect_id: connectAccountId, payout_method: 'stripe' })
        .eq('id', affiliate.id);
    }

    // Create an onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: `${APP_URL}/affiliate/settings?stripe=refresh`,
      return_url: `${APP_URL}/affiliate/settings?stripe=success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      account_id: connectAccountId,
    });
  } catch (error: any) {
    console.error('Stripe Connect error:', error);
    
    // Check if Connect is not enabled on the platform
    const msg = error.message || '';
    if (msg.includes('create new accounts') || msg.includes('Connect') || error.code === 'account_invalid') {
      return NextResponse.json(
        { error: 'Stripe Connect is not yet enabled on this platform. Please contact the admin or use PayPal/ACH payout method instead.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: msg || 'Failed to create Stripe Connect link' },
      { status: 500 }
    );
  }
}

// GET - Check Stripe Connect account status
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('stripe_connect_id')
      .eq('user_id', userId)
      .single();

    if (!affiliate?.stripe_connect_id) {
      return NextResponse.json({
        connected: false,
        details_submitted: false,
        payouts_enabled: false,
      });
    }

    // Check account status with Stripe
    try {
      const account = await stripe.accounts.retrieve(affiliate.stripe_connect_id);
      return NextResponse.json({
        connected: true,
        account_id: account.id,
        details_submitted: account.details_submitted,
        payouts_enabled: account.payouts_enabled,
        charges_enabled: account.charges_enabled,
      });
    } catch {
      // If Stripe Connect is not enabled or account doesn't exist
      return NextResponse.json({
        connected: false,
        details_submitted: false,
        payouts_enabled: false,
      });
    }
  } catch (error: any) {
    console.error('Stripe Connect status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check Stripe Connect status' },
      { status: 500 }
    );
  }
}
