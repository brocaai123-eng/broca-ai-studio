import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Register as an affiliate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, fullName, phone, company, referralCode } = body;

    if (!userId || !email || !fullName) {
      return NextResponse.json(
        { error: 'User ID, email, and full name are required' },
        { status: 400 }
      );
    }

    // Check if user already has an affiliate account
    const { data: existing } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'You already have an affiliate account' },
        { status: 409 }
      );
    }

    // Generate a unique referral code if not provided
    let code = referralCode?.toUpperCase().replace(/[^A-Z0-9]/g, '') || '';
    if (!code) {
      const namePart = fullName.split(' ')[0].toUpperCase().slice(0, 4);
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      code = `${namePart}${randomPart}`;
    }

    // Ensure referral code is unique
    const { data: codeExists } = await supabase
      .from('affiliates')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle();

    if (codeExists) {
      // Append random chars to make unique
      code = `${code}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
    }

    // Update profile role to affiliate
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'affiliate' })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile role:', profileError);
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
    }

    // Create affiliate record
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .insert({
        user_id: userId,
        email: email.toLowerCase(),
        full_name: fullName,
        phone: phone || null,
        company: company || null,
        referral_code: code,
        status: 'active',
        commission_rate: 25.00,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating affiliate:', error);
      // Rollback profile role change
      await supabase
        .from('profiles')
        .update({ role: 'broker' })
        .eq('id', userId);
      return NextResponse.json({ error: 'Failed to create affiliate account' }, { status: 500 });
    }

    return NextResponse.json({ affiliate }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/affiliate/register:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
