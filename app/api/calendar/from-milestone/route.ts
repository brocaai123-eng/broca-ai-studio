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

/**
 * Sync a milestone to calendar events based on assignment:
 * - If owner_id is set → create/update event ONLY for that broker
 * - If owner_id is null (unassigned) → create/update events for ALL collaborators on the case
 * Also cleans up stale events when assignment changes.
 */
export async function syncMilestoneToCalendar(milestoneId: string, clientId: string) {
  // Fetch milestone
  const { data: milestone } = await supabaseAdmin
    .from('case_milestones')
    .select(`
      id, title, description, due_date, status, owner_id, client_id,
      client:clients!case_milestones_client_id_fkey(id, name, broker_id)
    `)
    .eq('id', milestoneId)
    .single();

  if (!milestone || !milestone.due_date) return;

  const client = Array.isArray(milestone.client) ? milestone.client[0] : milestone.client;
  if (!client) return;

  const dueDate = new Date(milestone.due_date);
  const eventStatus = milestone.status === 'completed' ? 'completed' : 'scheduled';

  // Determine which broker(s) should have the calendar event
  let targetBrokerIds: string[] = [];

  if (milestone.owner_id) {
    // Assigned to a specific broker → only they get the event
    targetBrokerIds = [milestone.owner_id];
  } else {
    // Unassigned → all collaborators + case owner get the event
    // Get the case owner (client's broker_id)
    const ownerBrokerId = client.broker_id;

    // Get all active collaborators on this case
    const { data: collaborators } = await supabaseAdmin
      .from('case_collaborators')
      .select('broker_id')
      .eq('client_id', clientId)
      .eq('status', 'active');

    const collabIds = (collaborators || []).map(c => c.broker_id);

    // Combine owner + collaborators, deduplicate
    targetBrokerIds = [...new Set([ownerBrokerId, ...collabIds])];
  }

  // Get all existing calendar events for this milestone
  const { data: existingEvents } = await supabaseAdmin
    .from('calendar_events')
    .select('id, broker_id')
    .eq('milestone_id', milestoneId);

  const existingByBroker = new Map((existingEvents || []).map(e => [e.broker_id, e.id]));

  // Create or update events for target brokers
  for (const brokerId of targetBrokerIds) {
    const existingId = existingByBroker.get(brokerId);

    if (existingId) {
      // Update existing event
      await supabaseAdmin
        .from('calendar_events')
        .update({
          title: `Deadline: ${milestone.title}`,
          description: milestone.description || `Milestone deadline for ${client.name}`,
          start_time: dueDate.toISOString(),
          end_time: new Date(dueDate.getTime() + 30 * 60 * 1000).toISOString(),
          status: eventStatus,
          completed_at: eventStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', existingId);

      existingByBroker.delete(brokerId); // mark as handled
    } else {
      // Create new event
      await supabaseAdmin
        .from('calendar_events')
        .insert({
          broker_id: brokerId,
          title: `Deadline: ${milestone.title}`,
          description: milestone.description || `Milestone deadline for ${client.name}`,
          start_time: dueDate.toISOString(),
          end_time: new Date(dueDate.getTime() + 30 * 60 * 1000).toISOString(),
          event_type: 'deadline',
          client_id: clientId,
          milestone_id: milestoneId,
          reminders: [
            { type: 'email', minutes_before: 1440 },
            { type: 'email', minutes_before: 60 },
          ],
          status: eventStatus,
          completed_at: eventStatus === 'completed' ? new Date().toISOString() : null,
        });
    }
  }

  // Delete stale events for brokers who should no longer have them
  // (e.g. milestone was reassigned from "unassigned" to a specific broker)
  for (const [, staleEventId] of existingByBroker) {
    await supabaseAdmin
      .from('calendar_events')
      .delete()
      .eq('id', staleEventId);
  }
}

/**
 * Remove all calendar events for a milestone (used when due_date is cleared)
 */
export async function removeMilestoneCalendarEvents(milestoneId: string) {
  await supabaseAdmin
    .from('calendar_events')
    .delete()
    .eq('milestone_id', milestoneId);
}

// POST - Manually trigger calendar sync for a milestone
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { milestoneId } = await request.json();
    if (!milestoneId) {
      return NextResponse.json({ error: 'Milestone ID is required' }, { status: 400 });
    }

    // Get milestone to check access and get client_id
    const { data: milestone } = await supabaseAdmin
      .from('case_milestones')
      .select(`
        id, client_id, due_date,
        client:clients!case_milestones_client_id_fkey(id, broker_id)
      `)
      .eq('id', milestoneId)
      .single();

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }
    if (!milestone.due_date) {
      return NextResponse.json({ error: 'Milestone has no due date' }, { status: 400 });
    }

    // Check access
    const client = Array.isArray(milestone.client) ? milestone.client[0] : milestone.client;
    let hasAccess = client?.broker_id === user.id;
    if (!hasAccess) {
      const { data: collab } = await supabaseAdmin
        .from('case_collaborators')
        .select('id')
        .eq('client_id', milestone.client_id)
        .eq('broker_id', user.id)
        .eq('status', 'active')
        .single();
      hasAccess = !!collab;
    }
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Sync milestone to calendar
    await syncMilestoneToCalendar(milestoneId, milestone.client_id);

    return NextResponse.json({ success: true, message: 'Calendar events synced' });
  } catch (error: any) {
    console.error('Error in from-milestone:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync calendar' }, { status: 500 });
  }
}
