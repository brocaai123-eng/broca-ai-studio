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

// GET - Pending collaboration invites for the current broker
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get pending invites where the current user is the collaborator
    const { data: invites, error } = await supabaseAdmin
      .from('case_collaborators')
      .select(`
        *,
        client:clients(id, name, email, status),
        invited_by_profile:profiles!case_collaborators_added_by_fkey(id, full_name, email, avatar_url, company)
      `)
      .eq('broker_id', user.id)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending invites:', error);
      return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
    }

    return NextResponse.json({ invites: invites || [] });
  } catch (error) {
    console.error('Error in GET pending invites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
