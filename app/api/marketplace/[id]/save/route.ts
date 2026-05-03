import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const body = await request.json();
    if (body.userId) return body.userId;
  } catch {
    // no body — try auth header
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data } = await supabase.auth.getUser(token);
    return data.user?.id ?? null;
  }
  const cookieStr = request.headers.get('cookie') || '';
  const match = cookieStr.match(/sb-[^=]+-auth-token=([^;]+)/);
  if (match) {
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      const token = Array.isArray(parsed) ? parsed[0] : parsed.access_token;
      if (token) {
        const { data } = await supabase.auth.getUser(token);
        return data.user?.id ?? null;
      }
    } catch { /* ignore */ }
  }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params;
    const userId = await getUserId(request);

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
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');

    if (!userId) {
      userId = await getUserId(request);
    }

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
