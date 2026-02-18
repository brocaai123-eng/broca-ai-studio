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

// POST - Quick schedule a meeting from client page
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      clientId,
      title,
      start_time,
      duration_minutes,
      event_type,
      video_link,
      notes,
    } = body;

    // Validation
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!start_time) {
      return NextResponse.json({ error: 'Start time is required' }, { status: 400 });
    }

    // Verify client exists and belongs to broker
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, name, broker_id')
      .eq('id', clientId)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check access (owner or collaborator)
    let hasAccess = client.broker_id === user.id;
    if (!hasAccess) {
      const { data: collab } = await supabaseAdmin
        .from('case_collaborators')
        .select('id')
        .eq('client_id', clientId)
        .eq('broker_id', user.id)
        .eq('status', 'active')
        .single();
      hasAccess = !!collab;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Calculate end time
    const startDate = new Date(start_time);
    const durationMs = (duration_minutes || 30) * 60 * 1000;
    const endDate = new Date(startDate.getTime() + durationMs);

    // Create the event
    const { data: event, error } = await supabaseAdmin
      .from('calendar_events')
      .insert({
        broker_id: user.id,
        title: title.trim(),
        description: notes || null,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        event_type: event_type || 'meeting',
        client_id: clientId,
        video_link: video_link || null,
        reminders: [
          { type: 'email', minutes_before: 30 },
          { type: 'email', minutes_before: 1440 },
        ],
        status: 'scheduled',
      })
      .select(`
        *,
        client:clients!calendar_events_client_id_fkey(id, name)
      `)
      .single();

    if (error) {
      console.error('Error creating quick schedule event:', error);
      return NextResponse.json({ error: 'Failed to schedule meeting' }, { status: 500 });
    }

    // Normalize joined data
    const normalizedEvent = {
      ...event,
      client: Array.isArray(event.client) ? event.client[0] || null : event.client,
    };

    // Send email notifications (non-blocking)
    sendEventCreatedNotifications(normalizedEvent).catch(err =>
      console.error('Failed to send quick-schedule notifications:', err)
    );

    return NextResponse.json({ event: normalizedEvent }, { status: 201 });
  } catch (error: any) {
    console.error('Error in quick-schedule:', error);
    return NextResponse.json({ error: error.message || 'Failed to schedule meeting' }, { status: 500 });
  }
}
