import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAuthUserId(request: NextRequest): Promise<string | null> {
  // Try Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data } = await supabase.auth.getUser(token);
    if (data.user?.id) return data.user.id;
  }
  // Fall back to Supabase SSR cookie client
  try {
    const serverClient = await createClient();
    const { data } = await serverClient.auth.getUser();
    if (data.user?.id) return data.user.id;
  } catch { /* ignore */ }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params;
    const userId = await getAuthUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: existing } = await supabase
      .from('marketplace_saved_listings')
      .select('id')
      .eq('listing_id', listingId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Listing already saved' });
    }

    const { data, error } = await supabase
      .from('marketplace_saved_listings')
      .insert({ listing_id: listingId, user_id: userId })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ saved: data }, { status: 201 });
  } catch (error) {
    console.error('Save listing error:', error);
    return NextResponse.json({ error: 'Failed to save listing' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params;
    const userId = await getAuthUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { error } = await supabase
      .from('marketplace_saved_listings')
      .delete()
      .eq('listing_id', listingId)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unsave listing error:', error);
    return NextResponse.json({ error: 'Failed to unsave listing' }, { status: 500 });
  }
}
