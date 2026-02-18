import { createClient } from '@supabase/supabase-js';
import {
  sendEventInvitationEmail,
  sendEventConfirmationEmail,
  sendEventUpdateEmail,
  sendEventCancellationEmail,
  sendMilestoneDeadlineEmail,
} from '@/lib/email/resend';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get broker profile (name + email) by ID
 */
export async function getBrokerProfile(brokerId: string) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', brokerId)
    .single();
  return data;
}

/**
 * Send confirmation email to event creator + invitation emails to attendees
 * Called after creating a new event
 */
export async function sendEventCreatedNotifications(event: {
  id: string;
  broker_id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  event_type: string;
  client_id?: string | null;
  video_link?: string | null;
  location?: string | null;
  attendees?: Array<{ email: string; name?: string; status?: string }>;
  client?: { id: string; name: string } | null;
}) {
  try {
    const broker = await getBrokerProfile(event.broker_id);
    if (!broker?.email) {
      console.warn('Cannot send notifications: broker email not found for', event.broker_id);
      return;
    }

    const clientName = event.client?.name;
    const attendees = event.attendees || [];
    const organizerName = broker.full_name || 'A team member';

    // 1. Send confirmation to the event creator
    try {
      await sendEventConfirmationEmail({
        to: broker.email,
        brokerName: broker.full_name || 'there',
        eventTitle: event.title,
        eventType: event.event_type,
        startTime: event.start_time,
        endTime: event.end_time,
        location: event.location || undefined,
        videoLink: event.video_link || undefined,
        clientName: clientName || undefined,
        attendeeCount: attendees.length,
      });
    } catch (err) {
      console.error('Failed to send event confirmation to organizer:', err);
    }

    // 2. Send invitation emails to all attendees
    for (const attendee of attendees) {
      if (!attendee.email || attendee.email === broker.email) continue;
      try {
        await sendEventInvitationEmail({
          to: attendee.email,
          attendeeName: attendee.name,
          organizerName,
          eventTitle: event.title,
          eventType: event.event_type,
          startTime: event.start_time,
          endTime: event.end_time,
          location: event.location || undefined,
          videoLink: event.video_link || undefined,
          description: event.description || undefined,
          clientName: clientName || undefined,
        });
      } catch (err) {
        console.error(`Failed to send invitation to attendee ${attendee.email}:`, err);
      }
    }
  } catch (err) {
    console.error('Error in sendEventCreatedNotifications:', err);
  }
}

/**
 * Send update emails to event creator + attendees when event is modified
 */
export async function sendEventUpdatedNotifications(
  updatedEvent: {
    id: string;
    broker_id: string;
    title: string;
    start_time: string;
    end_time: string;
    event_type: string;
    client_id?: string | null;
    video_link?: string | null;
    location?: string | null;
    attendees?: Array<{ email: string; name?: string; status?: string }>;
    status?: string;
    client?: { id: string; name: string } | null;
  },
  previousEvent: {
    title?: string;
    start_time?: string;
    end_time?: string;
    location?: string | null;
    video_link?: string | null;
    status?: string;
  },
  changes: Record<string, unknown>
) {
  try {
    const broker = await getBrokerProfile(updatedEvent.broker_id);
    if (!broker?.email) return;

    const organizerName = broker.full_name || 'A team member';
    const clientName = updatedEvent.client?.name;
    const attendees = updatedEvent.attendees || [];

    // Build list of human-readable changes
    const changesList: string[] = [];
    if (changes.title) changesList.push(`Title changed to "${updatedEvent.title}"`);
    if (changes.start_time || changes.end_time) changesList.push('Date/time updated');
    if (changes.location !== undefined) changesList.push(updatedEvent.location ? `Location changed to "${updatedEvent.location}"` : 'Location removed');
    if (changes.video_link !== undefined) changesList.push(updatedEvent.video_link ? 'Video link updated' : 'Video link removed');
    if (changes.event_type) changesList.push(`Event type changed`);
    if (changes.status === 'cancelled') changesList.push('Event cancelled');

    // If cancelled, send cancellation emails instead
    if (changes.status === 'cancelled') {
      // Send cancellation to organizer
      try {
        await sendEventCancellationEmail({
          to: broker.email,
          recipientName: broker.full_name,
          organizerName,
          eventTitle: updatedEvent.title,
          eventType: updatedEvent.event_type,
          startTime: updatedEvent.start_time,
          clientName: clientName || undefined,
        });
      } catch (err) {
        console.error('Failed to send cancellation to organizer:', err);
      }

      // Send cancellation to attendees
      for (const attendee of attendees) {
        if (!attendee.email || attendee.email === broker.email) continue;
        try {
          await sendEventCancellationEmail({
            to: attendee.email,
            recipientName: attendee.name,
            organizerName,
            eventTitle: updatedEvent.title,
            eventType: updatedEvent.event_type,
            startTime: updatedEvent.start_time,
            clientName: clientName || undefined,
          });
        } catch (err) {
          console.error(`Failed to send cancellation to ${attendee.email}:`, err);
        }
      }
      return;
    }

    // If there are meaningful changes, send update emails
    if (changesList.length === 0) return;

    // Send update to organizer
    try {
      await sendEventUpdateEmail({
        to: broker.email,
        recipientName: broker.full_name,
        organizerName,
        eventTitle: updatedEvent.title,
        eventType: updatedEvent.event_type,
        startTime: updatedEvent.start_time,
        endTime: updatedEvent.end_time,
        location: updatedEvent.location || undefined,
        videoLink: updatedEvent.video_link || undefined,
        clientName: clientName || undefined,
        changes: changesList,
      });
    } catch (err) {
      console.error('Failed to send update to organizer:', err);
    }

    // Send update to attendees
    for (const attendee of attendees) {
      if (!attendee.email || attendee.email === broker.email) continue;
      try {
        await sendEventUpdateEmail({
          to: attendee.email,
          recipientName: attendee.name,
          organizerName,
          eventTitle: updatedEvent.title,
          eventType: updatedEvent.event_type,
          startTime: updatedEvent.start_time,
          endTime: updatedEvent.end_time,
          location: updatedEvent.location || undefined,
          videoLink: updatedEvent.video_link || undefined,
          clientName: clientName || undefined,
          changes: changesList,
        });
      } catch (err) {
        console.error(`Failed to send update to ${attendee.email}:`, err);
      }
    }
  } catch (err) {
    console.error('Error in sendEventUpdatedNotifications:', err);
  }
}

/**
 * Send milestone deadline notification emails to target broker(s)
 */
export async function sendMilestoneCalendarNotifications(
  milestone: {
    id: string;
    title: string;
    description?: string | null;
    due_date: string;
    priority?: string;
  },
  clientName: string,
  clientId: string,
  brokerIds: string[]
) {
  try {
    for (const brokerId of brokerIds) {
      const broker = await getBrokerProfile(brokerId);
      if (!broker?.email) continue;

      try {
        await sendMilestoneDeadlineEmail({
          to: broker.email,
          brokerName: broker.full_name || 'there',
          milestoneTitle: milestone.title,
          clientName,
          dueDate: milestone.due_date,
          priority: milestone.priority,
          description: milestone.description || undefined,
          clientId,
        });
      } catch (err) {
        console.error(`Failed to send milestone notification to ${broker.email}:`, err);
      }
    }
  } catch (err) {
    console.error('Error in sendMilestoneCalendarNotifications:', err);
  }
}
