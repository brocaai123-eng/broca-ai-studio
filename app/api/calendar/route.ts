import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { sendEventCreatedNotifications } from '@/lib/email/calendar-notifications';

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

// GET - Fetch calendar events for a date range
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    let query = supabaseAdmin
      .from('calendar_events')
      .select(`
        *,
        client:clients!calendar_events_client_id_fkey(id, name),
        milestone:case_milestones!calendar_events_milestone_id_fkey(id, title)
      `)
      .eq('broker_id', user.id)
      .order('start_time', { ascending: true });

    // Filter by date range if provided
    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    if (endDate) {
      query = query.lte('end_time', endDate);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching calendar events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    // Normalize joined data (handle array returns from Supabase)
    const normalizedEvents = (events || []).map(event => ({
      ...event,
      client: Array.isArray(event.client) ? event.client[0] || null : event.client,
      milestone: Array.isArray(event.milestone) ? event.milestone[0] || null : event.milestone,
    }));

    return NextResponse.json({ events: normalizedEvents });
  } catch (error) {
    console.error('Error in GET calendar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      title,
      description,
      start_time,
      end_time,
      all_day,
      event_type,
      client_id,
      milestone_id,
      video_link,
      location,
      attendees,
      reminders,
      color,
      notes,
    } = body;

    // Validation
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!start_time || !end_time) {
      return NextResponse.json({ error: 'Start and end time are required' }, { status: 400 });
    }
    if (new Date(end_time) <= new Date(start_time)) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    const validTypes = ['meeting', 'call', 'deadline', 'reminder', 'milestone'];
    if (event_type && !validTypes.includes(event_type)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Create the event
    const { data: event, error } = await supabaseAdmin
      .from('calendar_events')
      .insert({
        broker_id: user.id,
        title: title.trim(),
        description: description || null,
        start_time,
        end_time,
        all_day: all_day || false,
        event_type: event_type || 'meeting',
        client_id: client_id || null,
        milestone_id: milestone_id || null,
        video_link: video_link || null,
        location: location || null,
        attendees: attendees || [],
        reminders: reminders || [],
        color: color || null,
        notes: notes || null,
        status: 'scheduled',
      })
      .select(`
        *,
        client:clients!calendar_events_client_id_fkey(id, name),
        milestone:case_milestones!calendar_events_milestone_id_fkey(id, title)
      `)
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    // Normalize joined data
    const normalizedEvent = {
      ...event,
      client: Array.isArray(event.client) ? event.client[0] || null : event.client,
      milestone: Array.isArray(event.milestone) ? event.milestone[0] || null : event.milestone,
    };

    // Send email notifications (non-blocking)
    sendEventCreatedNotifications(normalizedEvent).catch(err =>
      console.error('Failed to send event creation notifications:', err)
    );

    return NextResponse.json({ event: normalizedEvent }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST calendar:', error);
    return NextResponse.json({ error: error.message || 'Failed to create event' }, { status: 500 });
  }
}
