import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendReferralSuccessNotificationEmail } from '@/lib/email/resend';

// Use service role to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Verify a referral token
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const { data: referral, error } = await supabase
      .from('broker_referrals')
      .select(`
        *,
        referrer:profiles!broker_referrals_referrer_id_fkey(id, full_name, company)
      `)
      .eq('referral_token', token)
      .single();

    if (error || !referral) {
      return NextResponse.json({ valid: false, error: 'Invalid referral token' }, { status: 404 });
    }

    // Check if expired
    if (new Date(referral.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'This referral has expired' }, { status: 400 });
    }

    // Check if already used
    if (referral.status !== 'pending') {
      return NextResponse.json({ valid: false, error: 'This referral has already been used' }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      referral: {
        id: referral.id,
        referred_email: referral.referred_email,
        referred_name: referral.referred_name,
        referrer_name: referral.referrer?.full_name,
        referrer_company: referral.referrer?.company,
        expires_at: referral.expires_at,
      }
    });
  } catch (error) {
    console.error('Error verifying referral token:', error);
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Complete a referral (called after signup)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newUserId, newUserEmail } = body;

    if (!token || !newUserId) {
      return NextResponse.json({ error: 'Token and new user ID are required' }, { status: 400 });
    }

    // Find the referral
    const { data: referral, error: fetchError } = await supabase
      .from('broker_referrals')
      .select('*')
      .eq('referral_token', token)
      .eq('status', 'pending')
      .single();

    if (fetchError || !referral) {
      return NextResponse.json({ error: 'Invalid or already used referral' }, { status: 400 });
    }

    // Check if expired
    if (new Date(referral.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('broker_referrals')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', referral.id);
      return NextResponse.json({ error: 'This referral has expired' }, { status: 400 });
    }

    // Update the referral to accepted
    const { error: updateError } = await supabase
      .from('broker_referrals')
      .update({
        status: 'accepted',
        referred_user_id: newUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', referral.id);

    if (updateError) {
      console.error('Error updating referral:', updateError);
      return NextResponse.json({ error: 'Failed to process referral' }, { status: 500 });
    }

    // Add bonus tokens to the referrer's subscription
    const { data: referrerSubscription, error: subError } = await supabase
      .from('broker_subscriptions')
      .select('id, tokens_remaining')
      .eq('broker_id', referral.referrer_id)
      .maybeSingle();

    if (referrerSubscription) {
      const newTokenBalance = referrerSubscription.tokens_remaining + referral.reward_amount;

      // Update referrer's token balance
      const { error: tokenUpdateError } = await supabase
        .from('broker_subscriptions')
        .update({ 
          tokens_remaining: newTokenBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', referrerSubscription.id);

      if (!tokenUpdateError) {
        // Mark tokens as rewarded
        await supabase
          .from('broker_referrals')
          .update({ tokens_rewarded: true })
          .eq('id', referral.id);

        // Log the token transaction
        await supabase
          .from('token_transactions')
          .insert({
            broker_id: referral.referrer_id,
            action_type: 'referral_bonus',
            description: `Referral bonus: ${newUserEmail || 'New broker'} signed up`,
            tokens_amount: referral.reward_amount,
            balance_after: newTokenBalance,
          });
      }
    }

    // Notify the referrer that their referral signed up
    try {
      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', referral.referrer_id)
        .single();

      if (referrerProfile?.email) {
        sendReferralSuccessNotificationEmail({
          to: referrerProfile.email,
          referrerName: referrerProfile.full_name || 'Broker',
          referredName: referral.referred_name || '',
          referredEmail: newUserEmail || referral.referred_email || '',
          tokensAwarded: referral.reward_amount,
        }).catch((err: unknown) => console.error('Failed to send referral success notification:', err));
      }
    } catch (notifyErr) {
      console.error('Error fetching referrer for notification:', notifyErr);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Referral completed successfully',
      tokensAwarded: referral.reward_amount
    });
  } catch (error) {
    console.error('Error completing referral:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
