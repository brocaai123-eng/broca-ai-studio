import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Track affiliate link click
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 });
    }

    // Validate the affiliate exists and is active
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('id, referral_code, full_name, company, status, total_clicks')
      .eq('referral_code', code.toUpperCase())
      .single();

    if (error || !affiliate) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    if (affiliate.status !== 'active') {
      return NextResponse.json({ error: 'This affiliate link is no longer active' }, { status: 403 });
    }

    // Increment click count using RPC for atomic increment
    await supabase.rpc('increment_affiliate_clicks', { affiliate_uuid: affiliate.id });

    return NextResponse.json({
      valid: true,
      affiliate: {
        name: affiliate.full_name,
        company: affiliate.company,
        code: affiliate.referral_code,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/affiliate/track:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Record a conversion (called from signup flow)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { affiliateCode, referredEmail, referredName, referredUserId, planName, planPrice } = body;

    if (!affiliateCode || !referredEmail) {
      return NextResponse.json({ error: 'Affiliate code and referred email are required' }, { status: 400 });
    }

    // Get affiliate
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('id, commission_rate')
      .eq('referral_code', affiliateCode.toUpperCase())
      .eq('status', 'active')
      .single();

    if (affError || !affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    }

    // Check if referral already exists
    const { data: existing } = await supabase
      .from('affiliate_referrals')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .eq('referred_email', referredEmail.toLowerCase())
      .maybeSingle();

    if (existing) {
      // Update existing referral
      const { data: updated, error } = await supabase
        .from('affiliate_referrals')
        .update({
          status: referredUserId ? 'signed_up' : 'clicked',
          referred_user_id: referredUserId || null,
          referred_name: referredName || null,
          plan_name: planName || null,
          plan_price: planPrice || 0,
          mrr: planPrice || 0,
          commission_rate: affiliate.commission_rate,
          monthly_commission: planPrice ? Number(planPrice) * (affiliate.commission_rate / 100) : 0,
          signed_up_at: referredUserId ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating referral:', error);
        return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 });
      }

      return NextResponse.json({ referral: updated });
    }

    // Create new referral
    const { data: referral, error } = await supabase
      .from('affiliate_referrals')
      .insert({
        affiliate_id: affiliate.id,
        referred_email: referredEmail.toLowerCase(),
        referred_name: referredName || null,
        referred_user_id: referredUserId || null,
        status: referredUserId ? 'signed_up' : 'clicked',
        plan_name: planName || null,
        plan_price: planPrice || 0,
        mrr: planPrice || 0,
        commission_rate: affiliate.commission_rate,
        monthly_commission: planPrice ? Number(planPrice) * (affiliate.commission_rate / 100) : 0,
        signed_up_at: referredUserId ? new Date().toISOString() : null,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating referral:', error);
      return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 });
    }

    return NextResponse.json({ referral }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/affiliate/track:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
