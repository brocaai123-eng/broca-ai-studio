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

// GET - Collaboration stats for dashboard
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: stats, error } = await supabaseAdmin.rpc('get_collaboration_stats', {
      broker_uuid: user.id,
    });

    if (error) {
      console.error('Error fetching collaboration stats:', error);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // RPC returns a single row or array
    const result = Array.isArray(stats) ? stats[0] : stats;

    return NextResponse.json({
      stats: result || {
        total_collaborations: 0,
        pending_invites: 0,
        milestones_due_today: 0,
        blocked_milestones: 0,
        unread_mentions: 0,
      },
    });
  } catch (error) {
    console.error('Error in GET collaboration stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
