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

// Helper: Check if user has access to this case
async function hasAccess(clientId: string, userId: string): Promise<boolean> {
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('broker_id')
    .eq('id', clientId)
    .single();
  if (client?.broker_id === userId) return true;

  const { data: collab } = await supabaseAdmin
    .from('case_collaborators')
    .select('status')
    .eq('client_id', clientId)
    .eq('broker_id', userId)
    .in('status', ['active', 'pending'])
    .single();
  return !!collab;
}

// Helper: Check if user can post messages/comments on this case
async function canMessage(clientId: string, userId: string): Promise<boolean> {
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('broker_id')
    .eq('id', clientId)
    .single();
  if (client?.broker_id === userId) return true;

  const { data: collab } = await supabaseAdmin
    .from('case_collaborators')
    .select('role, permissions')
    .eq('client_id', clientId)
    .eq('broker_id', userId)
    .eq('status', 'active')
    .single();

  if (!collab) return false;
  if (collab.role === 'owner' || collab.role === 'co_owner') return true;
  return collab.permissions?.can_message === true;
}

// GET - Fetch timeline entries for a case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify access
    const userHasAccess = await hasAccess(clientId, user.id);
    if (!userHasAccess) {
      return NextResponse.json({ error: 'You do not have access to this case' }, { status: 403 });
    }

    const { data: entries, error } = await supabaseAdmin
      .from('case_timeline')
      .select(`
        *,
        author:profiles!case_timeline_author_id_fkey(id, full_name, email, avatar_url),
        milestone:case_milestones!case_timeline_milestone_id_fkey(id, title)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching timeline:', error);
      return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
    }

    return NextResponse.json({ entries: entries || [] });
  } catch (error) {
    console.error('Error in GET timeline:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a comment to the timeline
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify user can post comments
    const userCanMessage = await canMessage(clientId, user.id);
    if (!userCanMessage) {
      return NextResponse.json({ error: 'You do not have permission to post comments' }, { status: 403 });
    }

    const { content, mentions } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const type = mentions && mentions.length > 0 ? 'mention' : 'comment';

    const { data: entry, error } = await supabaseAdmin
      .from('case_timeline')
      .insert({
        client_id: clientId,
        author_id: user.id,
        type,
        content: content.trim(),
        mentions: mentions || [],
      })
      .select(`
        *,
        author:profiles!case_timeline_author_id_fkey(id, full_name, email, avatar_url),
        milestone:case_milestones!case_timeline_milestone_id_fkey(id, title)
      `)
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: error.message || 'Failed to add comment' }, { status: 500 });
  }
}
