import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEventReminderEmail, sendMilestoneDeadlineEmail } from '@/lib/email/resend';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // If no CRON_SECRET is set, allow in development
  if (!cronSecret) {
    console.warn('CRON_SECRET not set - allowing request in development mode');
    return true;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Process calendar event reminders.
 * 
 * This endpoint should be called by a cron job every 5 minutes.
 * For Vercel: Add to vercel.json crons config
 * For other platforms: Use external cron service (cron-job.org, etc.)
 * 
 * How it works:
 * 1. Fetches all scheduled events with email reminders
 * 2. For each event, checks if any reminder should fire NOW
 *    (i.e., current time >= start_time - minutes_before)
 * 3. Checks calendar_reminder_logs to avoid duplicate sends
 * 4. Sends email via Resend and logs the result
 * 
 * GET /api/cron/process-reminders
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    console.log(`[Cron] Processing reminders at ${now.toISOString()}`);

    // Fetch all upcoming scheduled events that have email reminders
    // We look ahead max 7 days (10080 minutes = largest reminder preset)
    const maxLookAhead = new Date(now.getTime() + 10080 * 60 * 1000);
    
    const { data: events, error: fetchError } = await supabaseAdmin
      .from('calendar_events')
      .select(`
        id, broker_id, title, description, start_time, end_time, 
        event_type, client_id, milestone_id, video_link, location,
        reminders, status,
        client:clients!calendar_events_client_id_fkey(id, name)
      `)
      .eq('status', 'scheduled')
      .gte('start_time', now.toISOString())
      .lte('start_time', maxLookAhead.toISOString())
      .not('reminders', 'eq', '[]');

    if (fetchError) {
      console.error('[Cron] Error fetching events:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    if (!events || events.length === 0) {
      console.log('[Cron] No upcoming events with reminders found');
      return NextResponse.json({ message: 'No reminders to process', results });
    }

    console.log(`[Cron] Found ${events.length} events with reminders to check`);

    // Process each event's reminders
    for (const event of events) {
      const reminders = (event.reminders || []) as Array<{ type: string; minutes_before: number }>;
      const emailReminders = reminders.filter(r => r.type === 'email');
      
      if (emailReminders.length === 0) continue;

      const eventStart = new Date(event.start_time);
      const client = Array.isArray(event.client) ? event.client[0] : event.client;

      for (const reminder of emailReminders) {
        results.processed++;

        // Calculate when this reminder should fire
        const reminderTime = new Date(eventStart.getTime() - reminder.minutes_before * 60 * 1000);
        
        // Check if the reminder should fire now (within the last 6 minutes to account for cron interval)
        const sixMinutesAgo = new Date(now.getTime() - 6 * 60 * 1000);
        
        if (reminderTime > now || reminderTime < sixMinutesAgo) {
          // Not yet time, or already past the window
          results.skipped++;
          continue;
        }

        // Check if this reminder was already sent
        const { data: existingLog } = await supabaseAdmin
          .from('calendar_reminder_logs')
          .select('id')
          .eq('event_id', event.id)
          .eq('reminder_type', 'email')
          .eq('minutes_before', reminder.minutes_before)
          .single();

        if (existingLog) {
          // Already sent
          results.skipped++;
          continue;
        }

        // Get broker profile for email
        const { data: broker } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', event.broker_id)
          .single();

        if (!broker?.email) {
          results.failed++;
          results.errors.push(`No email found for broker ${event.broker_id} (event: ${event.id})`);
          continue;
        }

        try {
          // Send the reminder email
          if (event.event_type === 'deadline' && event.milestone_id) {
            // Milestone deadline reminder
            await sendMilestoneDeadlineEmail({
              to: broker.email,
              brokerName: broker.full_name || 'there',
              milestoneTitle: event.title.replace('Deadline: ', ''),
              clientName: client?.name || 'Unknown Client',
              dueDate: event.start_time,
              clientId: event.client_id || '',
            });
          } else {
            // Regular event reminder
            await sendEventReminderEmail({
              to: broker.email,
              brokerName: broker.full_name || 'there',
              eventTitle: event.title,
              eventType: event.event_type,
              startTime: event.start_time,
              endTime: event.end_time,
              minutesBefore: reminder.minutes_before,
              location: event.location,
              videoLink: event.video_link,
              clientName: client?.name,
            });
          }

          // Log successful send
          await supabaseAdmin
            .from('calendar_reminder_logs')
            .insert({
              event_id: event.id,
              reminder_type: 'email',
              minutes_before: reminder.minutes_before,
              status: 'sent',
            });

          results.sent++;
          console.log(`[Cron] Sent reminder for event "${event.title}" to ${broker.email} (${reminder.minutes_before}min before)`);
        } catch (emailError: any) {
          results.failed++;
          const errorMsg = emailError.message || 'Unknown email error';
          results.errors.push(`Failed to send reminder for event ${event.id}: ${errorMsg}`);

          // Log failed send
          await supabaseAdmin
            .from('calendar_reminder_logs')
            .insert({
              event_id: event.id,
              reminder_type: 'email',
              minutes_before: reminder.minutes_before,
              status: 'failed',
              error_message: errorMsg,
            });

          console.error(`[Cron] Failed to send reminder for event "${event.title}":`, emailError);
        }
      }
    }

    console.log(`[Cron] Reminder processing complete:`, results);
    return NextResponse.json({ message: 'Reminders processed', results });
  } catch (error: any) {
    console.error('[Cron] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
