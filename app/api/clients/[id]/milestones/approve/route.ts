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

// Helper: Check if user can approve on this case
async function canApprove(clientId: string, userId: string): Promise<boolean> {
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
  if (collab.role === 'owner' || collab.role === 'co_owner' || collab.role === 'reviewer') return true;
  return collab.permissions?.can_approve === true;
}

// POST - Approve or reject a milestone
export async function POST(
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

    // Verify can approve
    const userCanApprove = await canApprove(clientId, user.id);
    if (!userCanApprove) {
      return NextResponse.json({ error: 'You do not have permission to approve milestones' }, { status: 403 });
    }

    const { milestoneId, action, reason } = await request.json();
    // action: 'approve' | 'reject' | 'request_changes'

    if (!milestoneId) {
      return NextResponse.json({ error: 'Milestone ID is required' }, { status: 400 });
    }

    if (!['approve', 'reject', 'request_changes'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be: approve, reject, or request_changes' }, { status: 400 });
    }

    // Get milestone
    const { data: milestone } = await supabaseAdmin
      .from('case_milestones')
      .select('id, title, status, client_id')
      .eq('id', milestoneId)
      .eq('client_id', clientId)
      .single();

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    // Build timeline content based on action
    let timelineContent: string;
    let newStatus: string | null = null;
    let timelineType: string;

    switch (action) {
      case 'approve':
        timelineContent = `approved milestone "${milestone.title}"`;
        newStatus = 'completed';
        timelineType = 'milestone_completed';
        break;
      case 'reject':
        timelineContent = reason
          ? `rejected milestone "${milestone.title}" — ${reason}`
          : `rejected milestone "${milestone.title}"`;
        newStatus = 'blocked';
        timelineType = 'status_change';
        break;
      case 'request_changes':
        timelineContent = reason
          ? `requested changes on milestone "${milestone.title}" — ${reason}`
          : `requested changes on milestone "${milestone.title}"`;
        newStatus = 'in_progress';
        timelineType = 'status_change';
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update milestone status
    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (action === 'approve') {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = user.id;
    }

    const { data: updatedMilestone, error: updateError } = await supabaseAdmin
      .from('case_milestones')
      .update(updates)
      .eq('id', milestoneId)
      .select(`
        *,
        owner:profiles!case_milestones_owner_id_fkey(id, full_name, email, avatar_url)
      `)
      .single();

    if (updateError) {
      console.error('Error updating milestone:', updateError);
      return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 });
    }

    // Create timeline entry
    const { data: entry, error: timelineError } = await supabaseAdmin
      .from('case_timeline')
      .insert({
        client_id: clientId,
        author_id: user.id,
        type: timelineType,
        content: timelineContent,
        milestone_id: milestoneId,
        metadata: {
          action,
          reason: reason || null,
          old_status: milestone.status,
          new_status: newStatus,
          approved_by: action === 'approve' ? user.id : null,
        },
      })
      .select(`
        *,
        author:profiles!case_timeline_author_id_fkey(id, full_name, email, avatar_url),
        milestone:case_milestones!case_timeline_milestone_id_fkey(id, title)
      `)
      .single();

    if (timelineError) {
      console.error('Error creating timeline entry:', timelineError);
    }

    return NextResponse.json({
      milestone: updatedMilestone,
      timeline_entry: entry || null,
      action,
    });
  } catch (error: any) {
    console.error('Error in milestone approval:', error);
    return NextResponse.json({ error: error.message || 'Failed to process approval' }, { status: 500 });
  }
}
