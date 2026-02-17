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

// GET - Fetch upcoming events for dashboard widget
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const now = new Date().toISOString();

    const { data: events, error } = await supabaseAdmin
      .from('calendar_events')
      .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        all_day,
        event_type,
        client_id,
        video_link,
        location,
        status,
        client:clients!calendar_events_client_id_fkey(id, name)
      `)
      .eq('broker_id', user.id)
      .eq('status', 'scheduled')
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching upcoming events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    // Normalize joined data
    const normalizedEvents = (events || []).map(event => ({
      ...event,
      client: Array.isArray(event.client) ? event.client[0] || null : event.client,
    }));

    return NextResponse.json({ events: normalizedEvents });
  } catch (error) {
    console.error('Error in GET upcoming:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
