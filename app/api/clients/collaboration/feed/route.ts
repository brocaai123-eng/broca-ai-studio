import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Team feed (cross-case activity)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: feed, error } = await supabaseAdmin.rpc('get_team_feed', {
      broker_uuid: user.id,
      feed_limit: 20,
    });

    if (error) {
      console.error('Error fetching team feed:', error);
      return NextResponse.json({ error: 'Failed to fetch team feed' }, { status: 500 });
    }

    return NextResponse.json({ feed: feed || [] });
  } catch (error) {
    console.error('Error in GET team feed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
