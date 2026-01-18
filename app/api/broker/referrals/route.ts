import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Use service role to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// GET - Fetch all referrals for a broker
export async function GET(request: NextRequest) {
  try {
    const brokerId = request.nextUrl.searchParams.get('brokerId');

    if (!brokerId) {
      return NextResponse.json({ error: 'Broker ID is required' }, { status: 400 });
    }

    const { data: referrals, error } = await supabase
      .from('broker_referrals')
      .select(`
        *,
        referred_user:profiles!broker_referrals_referred_user_id_fkey(id, email, full_name)
      `)
      .eq('referrer_id', brokerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referrals:', error);
      return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 });
    }

    // Calculate stats
    const stats = {
      total_invites: referrals?.length || 0,
      pending_invites: referrals?.filter(r => r.status === 'pending').length || 0,
      accepted_invites: referrals?.filter(r => r.status === 'accepted').length || 0,
      tokens_earned: referrals?.filter(r => r.tokens_rewarded).reduce((sum, r) => sum + r.reward_amount, 0) || 0,
    };

    return NextResponse.json({ referrals, stats });
  } catch (error) {
    console.error('Error in GET /api/broker/referrals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new referral invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brokerId, email, name } = body;

    if (!brokerId || !email) {
      return NextResponse.json({ error: 'Broker ID and email are required' }, { status: 400 });
    }

    // Check if broker exists
    const { data: broker, error: brokerError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', brokerId)
      .single();

    if (brokerError || !broker) {
      return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
    }

    // Check if email is already a user
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'This email is already registered as a user' }, { status: 400 });
    }

    // Check if there's already a pending referral for this email
    const { data: existingReferral } = await supabase
      .from('broker_referrals')
      .select('id, status')
      .eq('referred_email', email.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (existingReferral) {
      return NextResponse.json({ error: 'A pending invitation already exists for this email' }, { status: 400 });
    }

    // Generate unique referral token
    const referralToken = randomUUID();
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create the referral
    const { data: referral, error: createError } = await supabase
      .from('broker_referrals')
      .insert({
        referrer_id: brokerId,
        referred_email: email.toLowerCase(),
        referred_name: name || null,
        referral_token: referralToken,
        status: 'pending',
        tokens_rewarded: false,
        reward_amount: 30, // 30 tokens reward
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating referral:', createError);
      return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 });
    }

    // Send referral email
    try {
      const { sendBrokerReferralEmail } = await import('@/lib/email/resend');
      await sendBrokerReferralEmail({
        to: email,
        referredName: name || 'there',
        referrerName: broker.full_name || 'A fellow broker',
        referralToken: referralToken,
        expiresAt: expiresAt,
      });
    } catch (emailError) {
      console.error('Error sending referral email:', emailError);
      // Don't fail the whole request if email fails, but log it
    }

    return NextResponse.json({ 
      referral,
      signupUrl: `${APP_URL}/signup?ref=${referralToken}`,
      message: 'Referral invitation sent successfully' 
    });
  } catch (error) {
    console.error('Error in POST /api/broker/referrals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Cancel a pending referral
export async function DELETE(request: NextRequest) {
  try {
    const referralId = request.nextUrl.searchParams.get('referralId');
    const brokerId = request.nextUrl.searchParams.get('brokerId');

    if (!referralId || !brokerId) {
      return NextResponse.json({ error: 'Referral ID and Broker ID are required' }, { status: 400 });
    }

    // Check if referral exists and belongs to the broker
    const { data: referral, error: fetchError } = await supabase
      .from('broker_referrals')
      .select('*')
      .eq('id', referralId)
      .eq('referrer_id', brokerId)
      .single();

    if (fetchError || !referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
    }

    if (referral.status !== 'pending') {
      return NextResponse.json({ error: 'Can only cancel pending referrals' }, { status: 400 });
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('broker_referrals')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', referralId);

    if (updateError) {
      console.error('Error cancelling referral:', updateError);
      return NextResponse.json({ error: 'Failed to cancel referral' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Referral cancelled successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/broker/referrals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
