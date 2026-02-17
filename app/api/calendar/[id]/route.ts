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

// GET - Fetch a single event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: event, error } = await supabaseAdmin
      .from('calendar_events')
      .select(`
        *,
        client:clients!calendar_events_client_id_fkey(id, name),
        milestone:case_milestones!calendar_events_milestone_id_fkey(id, title)
      `)
      .eq('id', eventId)
      .eq('broker_id', user.id)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Normalize joined data
    const normalizedEvent = {
      ...event,
      client: Array.isArray(event.client) ? event.client[0] || null : event.client,
      milestone: Array.isArray(event.milestone) ? event.milestone[0] || null : event.milestone,
    };

    return NextResponse.json({ event: normalizedEvent });
  } catch (error) {
    console.error('Error in GET event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update an event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('calendar_events')
      .select('id, broker_id')
      .eq('id', eventId)
      .single();

    if (!existing || existing.broker_id !== user.id) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Allowed fields to update
    const fields = [
      'title', 'description', 'start_time', 'end_time', 'all_day',
      'event_type', 'client_id', 'milestone_id', 'video_link', 'location',
      'attendees', 'reminders', 'color', 'notes', 'status'
    ];

    for (const field of fields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Handle status changes
    if (body.status === 'completed' && !body.completed_at) {
      updates.completed_at = new Date().toISOString();
    }

    // Validate times if provided
    if (updates.start_time && updates.end_time) {
      if (new Date(updates.end_time as string) <= new Date(updates.start_time as string)) {
        return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
      }
    }

    const { data: event, error } = await supabaseAdmin
      .from('calendar_events')
      .update(updates)
      .eq('id', eventId)
      .select(`
        *,
        client:clients!calendar_events_client_id_fkey(id, name),
        milestone:case_milestones!calendar_events_milestone_id_fkey(id, title)
      `)
      .single();

    if (error) {
      console.error('Error updating event:', error);
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    // Normalize joined data
    const normalizedEvent = {
      ...event,
      client: Array.isArray(event.client) ? event.client[0] || null : event.client,
      milestone: Array.isArray(event.milestone) ? event.milestone[0] || null : event.milestone,
    };

    return NextResponse.json({ event: normalizedEvent });
  } catch (error: any) {
    console.error('Error in PUT event:', error);
    return NextResponse.json({ error: error.message || 'Failed to update event' }, { status: 500 });
  }
}

// DELETE - Delete an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('calendar_events')
      .select('id, broker_id')
      .eq('id', eventId)
      .single();

    if (!existing || existing.broker_id !== user.id) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('calendar_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting event:', error);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE event:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete event' }, { status: 500 });
  }
}
