import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const subPromise = supabase
      .from('broker_subscriptions')
      .select('*')
      .eq('broker_id', userId)
      .maybeSingle();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Supabase query timeout')), 8000)
    );

    let subscription;
    try {
      const result = await Promise.race([subPromise, timeoutPromise]) as Awaited<typeof subPromise>;
      if (result.error) {
        console.error('Subscription fetch error:', {
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint,
          code: result.error.code,
        });
        return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
      }
      subscription = result.data;
    } catch (e) {
      console.error('Subscription query failed:', (e as Error).message);
      return NextResponse.json({ subscription: null });
    }

    if (!subscription) {
      return NextResponse.json({ subscription: null });
    }

    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', subscription.plan_id)
      .single();

    return NextResponse.json({
      subscription: {
        ...subscription,
        plan,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ subscription: null });
  }
}
