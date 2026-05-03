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

    const { data: listing, error } = await supabase
      .from('marketplace_listings')
      .select('*, broker:profiles!marketplace_listings_broker_id_fkey(*)')
      .eq('id', id)
      .single();

    if (error || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayViews } = await supabase
      .from('listing_views')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', id)
      .gte('viewed_at', today.toISOString());

    return NextResponse.json({
      listing,
      todayViews: todayViews || 0,
    });
  } catch (error) {
    console.error('Listing GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, ...updates } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('marketplace_listings')
      .select('broker_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (existing.broker_id !== userId) {
      return NextResponse.json({ error: 'Not authorized to update this listing' }, { status: 403 });
    }

    const { data: listing, error } = await supabase
      .from('marketplace_listings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, broker:profiles!marketplace_listings_broker_id_fkey(*)')
      .single();

    if (error) throw error;

    return NextResponse.json({ listing });
  } catch (error) {
    console.error('Listing PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const isAdmin = searchParams.get('isAdmin') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('marketplace_listings')
      .select('broker_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (existing.broker_id !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized to delete this listing' }, { status: 403 });
    }

    const { error } = await supabase
      .from('marketplace_listings')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Listing DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 });
  }
}
