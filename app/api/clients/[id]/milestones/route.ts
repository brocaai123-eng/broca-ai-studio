import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { syncMilestoneToCalendar, removeMilestoneCalendarEvents } from '@/app/api/calendar/from-milestone/route';

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
  // Check if owner
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('broker_id')
    .eq('id', clientId)
    .single();
  if (client?.broker_id === userId) return true;

  // Check as collaborator
  const { data: collab } = await supabaseAdmin
    .from('case_collaborators')
    .select('status')
    .eq('client_id', clientId)
    .eq('broker_id', userId)
    .in('status', ['active', 'pending'])
    .single();
  return !!collab;
}

// Helper: Check if user can edit milestones on this case
async function canEditMilestones(clientId: string, userId: string): Promise<boolean> {
  // Owner can always edit
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('broker_id')
    .eq('id', clientId)
    .single();
  if (client?.broker_id === userId) return true;

  // Check collaborator permissions
  const { data: collab } = await supabaseAdmin
    .from('case_collaborators')
    .select('role, permissions')
    .eq('client_id', clientId)
    .eq('broker_id', userId)
    .eq('status', 'active')
    .single();

  if (!collab) return false;
  if (collab.role === 'owner' || collab.role === 'co_owner') return true;
  return collab.permissions?.can_edit === true;
}

// Helper: Check if user can approve milestones on this case
async function canApproveMilestones(clientId: string, userId: string): Promise<boolean> {
  // Owner can always approve
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('broker_id')
    .eq('id', clientId)
    .single();
  if (client?.broker_id === userId) return true;

  // Check collaborator permissions
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

// GET - List milestones for a case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify the user has access to this case
    const userHasAccess = await hasAccess(clientId, user.id);
    if (!userHasAccess) {
      return NextResponse.json({ error: 'You do not have access to this case' }, { status: 403 });
    }

    const { data: milestones, error } = await supabaseAdmin
      .from('case_milestones')
      .select(`
        *,
        owner:profiles!case_milestones_owner_id_fkey(id, full_name, email, avatar_url)
      `)
      .eq('client_id', clientId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching milestones:', error);
      return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
    }

    return NextResponse.json({ milestones: milestones || [] });
  } catch (error) {
    console.error('Error in GET milestones:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a milestone
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify the user can edit milestones
    const userCanEdit = await canEditMilestones(clientId, user.id);
    if (!userCanEdit) {
      return NextResponse.json({ error: 'You do not have permission to create milestones' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, owner_id, priority, due_date } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Get max sort order
    const { data: last } = await supabaseAdmin
      .from('case_milestones')
      .select('sort_order')
      .eq('client_id', clientId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const { data: milestone, error } = await supabaseAdmin
      .from('case_milestones')
      .insert({
        client_id: clientId,
        title,
        description: description || null,
        owner_id: owner_id || user.id,
        priority: priority || 'medium',
        due_date: due_date || null,
        sort_order: (last?.sort_order || 0) + 1,
      })
      .select(`
        *,
        owner:profiles!case_milestones_owner_id_fkey(id, full_name, email, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error creating milestone:', error);
      return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 });
    }

    // Add timeline entry
    await supabaseAdmin.from('case_timeline').insert({
      client_id: clientId,
      author_id: user.id,
      type: 'milestone_created',
      content: `created milestone "${title}"`,
      milestone_id: milestone.id,
      metadata: { priority, due_date },
    });

    // Auto-sync to calendar if milestone has a due date
    if (due_date) {
      try {
        await syncMilestoneToCalendar(milestone.id, clientId);
      } catch (e) {
        console.error('Calendar sync error (non-blocking):', e);
      }
    }

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating milestone:', error);
    return NextResponse.json({ error: error.message || 'Failed to create milestone' }, { status: 500 });
  }
}

// PUT - Update a milestone
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify the user can edit milestones
    const userCanEdit = await canEditMilestones(clientId, user.id);
    if (!userCanEdit) {
      return NextResponse.json({ error: 'You do not have permission to update milestones' }, { status: 403 });
    }

    const body = await request.json();
    const { milestoneId, title, description, status, priority, owner_id, due_date } = body;

    if (!milestoneId) {
      return NextResponse.json({ error: 'Milestone ID is required' }, { status: 400 });
    }

    // Get current milestone for comparison
    const { data: current } = await supabaseAdmin
      .from('case_milestones')
      .select('status, title, started_at')
      .eq('id', milestoneId)
      .single();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (owner_id !== undefined) updates.owner_id = owner_id;
    if (due_date !== undefined) updates.due_date = due_date;

    if (status !== undefined) {
      updates.status = status;
      if (status === 'in_progress') {
        // Set started_at when first transitioning to in_progress (from not_started or blocked)
        if (current?.status === 'not_started' || current?.status === 'blocked') {
          updates.started_at = new Date().toISOString();
        }
      }
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = user.id;
        // Also set started_at if it was never started (direct complete from not_started)
        if (!current?.started_at) {
          updates.started_at = new Date().toISOString();
        }
      }
      // Clear completed_at if reopening from completed
      if (status !== 'completed' && current?.status === 'completed') {
        updates.completed_at = null;
        updates.completed_by = null;
      }
    }

    const { data: milestone, error } = await supabaseAdmin
      .from('case_milestones')
      .update(updates)
      .eq('id', milestoneId)
      .select(`
        *,
        owner:profiles!case_milestones_owner_id_fkey(id, full_name, email, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error updating milestone:', error);
      return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 });
    }

    // Add timeline entry for status changes
    if (status && status !== current?.status) {
      const entryType = status === 'completed' ? 'milestone_completed' : 'status_change';
      await supabaseAdmin.from('case_timeline').insert({
        client_id: clientId,
        author_id: user.id,
        type: entryType,
        content: status === 'completed'
          ? `completed milestone "${current?.title || title}"`
          : `changed milestone "${current?.title || title}" to ${status.replace('_', ' ')}`,
        milestone_id: milestoneId,
        metadata: { old_status: current?.status, new_status: status },
      });
    }

    // Auto-sync calendar when due_date, owner_id, status, or title changes
    const needsCalendarSync = due_date !== undefined || owner_id !== undefined || status !== undefined || title !== undefined;
    if (needsCalendarSync) {
      try {
        // If due_date was explicitly cleared, remove all calendar events for this milestone
        if (due_date === null) {
          await removeMilestoneCalendarEvents(milestoneId);
        } else {
          // Re-sync: handles assignment changes, status updates, title/date edits
          await syncMilestoneToCalendar(milestoneId, clientId);
        }
      } catch (e) {
        console.error('Calendar sync error (non-blocking):', e);
      }
    }

    return NextResponse.json({ milestone });
  } catch (error: any) {
    console.error('Error updating milestone:', error);
    return NextResponse.json({ error: error.message || 'Failed to update milestone' }, { status: 500 });
  }
}

// DELETE - Remove a milestone
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify the user can edit milestones
    const userCanEdit = await canEditMilestones(clientId, user.id);
    if (!userCanEdit) {
      return NextResponse.json({ error: 'You do not have permission to delete milestones' }, { status: 403 });
    }

    const milestoneId = request.nextUrl.searchParams.get('id');
    if (!milestoneId) {
      return NextResponse.json({ error: 'Milestone ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('case_milestones')
      .delete()
      .eq('id', milestoneId)
      .eq('client_id', clientId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting milestone:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete milestone' }, { status: 500 });
  }
}
