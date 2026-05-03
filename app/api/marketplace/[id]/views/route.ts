import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params;

    let userId: string | null = null;
    try {
      const body = await request.json();
      userId = body.userId ?? null;
    } catch {
      // No body is fine — anonymous view tracking
    }

    const viewRecord: Record<string, unknown> = {
      listing_id: listingId,
      viewed_at: new Date().toISOString(),
    };
    if (userId) viewRecord.user_id = userId;

    const { error: viewError } = await supabase
      .from('listing_views')
      .insert(viewRecord);

    if (viewError) {
      console.error('Insert view error (non-fatal):', viewError.message);
    }

    const { data: listing } = await supabase
      .from('marketplace_listings')
      .select('view_count')
      .eq('id', listingId)
      .single();

    await supabase
      .from('marketplace_listings')
      .update({ view_count: (listing?.view_count || 0) + 1 })
      .eq('id', listingId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Track view error:', error);
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
  }
}
