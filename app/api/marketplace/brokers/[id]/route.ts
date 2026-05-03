import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: broker, error: brokerError } = await supabase
      .from('broker_profiles')
      .select('*, profile:profiles(full_name, avatar_url)')
      .eq('id', id)
      .single();

    if (brokerError || !broker) {
      return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
    }

    const { data: listings, error: listingsError } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('broker_id', id)
      .eq('status', 'live')
      .order('created_at', { ascending: false });

    if (listingsError) {
      console.error('Error fetching broker listings:', listingsError);
    }

    return NextResponse.json({
      broker,
      listings: listings || [],
    });
  } catch (error) {
    console.error('Broker GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch broker profile' }, { status: 500 });
  }
}
