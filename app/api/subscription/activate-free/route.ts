import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { userId, planId } = await request.json();

    if (!userId || !planId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create service role client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the plan is free
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    if (plan.price !== 0) {
      return NextResponse.json(
        { error: 'This endpoint is only for free plans' },
        { status: 400 }
      );
    }

    // Check if subscription already exists
    const { data: existingSub } = await supabase
      .from('broker_subscriptions')
      .select('id')
      .eq('broker_id', userId)
      .maybeSingle();

    if (existingSub) {
      return NextResponse.json(
        { error: 'Subscription already exists' },
        { status: 409 }
      );
    }

    // Create free subscription
    const { data: subscription, error: subError } = await supabase
      .from('broker_subscriptions')
      .insert({
        broker_id: userId,
        plan_id: planId,
        status: 'active',
        tokens_remaining: plan.tokens_per_month,
        tokens_used: 0,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (subError) {
      console.error('Error creating subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to create subscription', details: subError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription,
    });

  } catch (error: any) {
    console.error('Error in activate-free:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
