import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Use Resend's test domain for development if custom domain isn't verified
// For production, verify your domain at https://resend.com/domains
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const APP_NAME = 'BrocaAI';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ============================================================
// Calendar & Event Notification Emails
// ============================================================

// Helper to format date/time for emails
function formatEventDateTime(dateStr: string): { date: string; time: string; full: string } {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return { date, time, full: `${date} at ${time}` };
}

function formatReminderTimeLabel(minutesBefore: number): string {
  if (minutesBefore === 0) return 'now';
  if (minutesBefore < 60) return `in ${minutesBefore} minutes`;
  if (minutesBefore < 1440) {
    const hrs = Math.round(minutesBefore / 60);
    return `in ${hrs} hour${hrs > 1 ? 's' : ''}`;
  }
  const days = Math.round(minutesBefore / 1440);
  return `in ${days} day${days > 1 ? 's' : ''}`;
}

function eventTypeEmoji(type: string): string {
  switch (type) {
    case 'meeting': return '📅';
    case 'call': return '📞';
    case 'deadline': return '⏰';
    case 'reminder': return '🔔';
    case 'milestone': return '🎯';
    default: return '📅';
  }
}

function eventTypeLabel(type: string): string {
  switch (type) {
    case 'meeting': return 'Meeting';
    case 'call': return 'Call';
    case 'deadline': return 'Deadline';
    case 'reminder': return 'Reminder';
    case 'milestone': return 'Milestone';
    default: return 'Event';
  }
}

// --- 1. Event Invitation Email ---
export interface SendEventInvitationEmailParams {
  to: string;
  attendeeName?: string;
  organizerName: string;
  eventTitle: string;
  eventType: string;
  startTime: string;
  endTime: string;
  location?: string;
  videoLink?: string;
  description?: string;
  clientName?: string;
  calendarUrl?: string;
}

export async function sendEventInvitationEmail({
  to,
  attendeeName,
  organizerName,
  eventTitle,
  eventType,
  startTime,
  endTime,
  location,
  videoLink,
  description,
  clientName,
  calendarUrl,
}: SendEventInvitationEmailParams) {
  const start = formatEventDateTime(startTime);
  const end = formatEventDateTime(endTime);
  const emoji = eventTypeEmoji(eventType);
  const typeLabel = eventTypeLabel(eventType);
  const viewUrl = calendarUrl || `${APP_URL}/dashboard/calendar`;

  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `${emoji} ${organizerName} invited you: ${eventTitle}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <tr>
          <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${emoji} ${APP_NAME}</h1>
            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">${typeLabel} Invitation</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px;">
            <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">Hi ${attendeeName || 'there'}! 👋</h2>
            <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
              <strong>${organizerName}</strong> has scheduled a <strong>${typeLabel.toLowerCase()}</strong> with you.
            </p>
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
              <h3 style="margin: 0 0 16px; color: #1e40af; font-size: 18px; font-weight: 600;">${eventTitle}</h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #1e40af; font-size: 14px;">📅 <strong>Date:</strong> ${start.date}</td></tr>
                <tr><td style="padding: 6px 0; color: #1e40af; font-size: 14px;">🕐 <strong>Time:</strong> ${start.time} – ${end.time}</td></tr>
                ${location ? `<tr><td style="padding: 6px 0; color: #1e40af; font-size: 14px;">📍 <strong>Location:</strong> ${location}</td></tr>` : ''}
                ${videoLink ? `<tr><td style="padding: 6px 0; color: #1e40af; font-size: 14px;">🔗 <strong>Video:</strong> <a href="${videoLink}" style="color: #2563eb; text-decoration: underline;">Join Meeting</a></td></tr>` : ''}
                ${clientName ? `<tr><td style="padding: 6px 0; color: #1e40af; font-size: 14px;">👤 <strong>Client:</strong> ${clientName}</td></tr>` : ''}
              </table>
            </div>
            ${description ? `<p style="margin: 0 0 24px; color: #52525b; font-size: 14px; line-height: 1.6; background: #fafafa; padding: 16px; border-radius: 8px;"><strong>Notes:</strong> ${description}</p>` : ''}
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr><td align="center">
                <a href="${viewUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">View in Calendar</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
            <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">This is an automated notification from ${APP_NAME}.</p>
            <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error('Failed to send event invitation email:', error);
    throw new Error(`Failed to send event invitation email: ${error.message}`);
  }
  console.log('Event invitation email sent to:', to);
  return data;
}

// --- 2. Event Reminder Email ---
export interface SendEventReminderEmailParams {
  to: string;
  brokerName: string;
  eventTitle: string;
  eventType: string;
  startTime: string;
  endTime: string;
  minutesBefore: number;
  location?: string;
  videoLink?: string;
  clientName?: string;
  calendarUrl?: string;
}

export async function sendEventReminderEmail({
  to,
  brokerName,
  eventTitle,
  eventType,
  startTime,
  endTime,
  minutesBefore,
  location,
  videoLink,
  clientName,
  calendarUrl,
}: SendEventReminderEmailParams) {
  const start = formatEventDateTime(startTime);
  const end = formatEventDateTime(endTime);
  const emoji = eventTypeEmoji(eventType);
  const typeLabel = eventTypeLabel(eventType);
  const timeLabel = formatReminderTimeLabel(minutesBefore);
  const viewUrl = calendarUrl || `${APP_URL}/dashboard/calendar`;

  // Choose urgency color based on how soon the event is
  const isUrgent = minutesBefore <= 30;
  const headerGradient = isUrgent
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  const accentColor = isUrgent ? '#dc2626' : '#d97706';
  const bgTint = isUrgent ? '#fef2f2' : '#fffbeb';
  const borderTint = isUrgent ? '#fecaca' : '#fde68a';
  const textTint = isUrgent ? '#991b1b' : '#92400e';

  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `⏰ Reminder: "${eventTitle}" starts ${timeLabel}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <tr>
          <td style="background: ${headerGradient}; padding: 40px 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">⏰ ${APP_NAME}</h1>
            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Event Reminder</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px;">
            <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">Hi ${brokerName}!</h2>
            <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
              Your <strong>${typeLabel.toLowerCase()}</strong> starts <strong>${timeLabel}</strong>.
            </p>
            <div style="background-color: ${bgTint}; border: 1px solid ${borderTint}; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
              <h3 style="margin: 0 0 16px; color: ${textTint}; font-size: 18px; font-weight: 600;">${emoji} ${eventTitle}</h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: ${textTint}; font-size: 14px;">📅 <strong>Date:</strong> ${start.date}</td></tr>
                <tr><td style="padding: 6px 0; color: ${textTint}; font-size: 14px;">🕐 <strong>Time:</strong> ${start.time} – ${end.time}</td></tr>
                ${location ? `<tr><td style="padding: 6px 0; color: ${textTint}; font-size: 14px;">📍 <strong>Location:</strong> ${location}</td></tr>` : ''}
                ${clientName ? `<tr><td style="padding: 6px 0; color: ${textTint}; font-size: 14px;">👤 <strong>Client:</strong> ${clientName}</td></tr>` : ''}
              </table>
            </div>
            ${videoLink ? `
            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 16px;">
              <tr><td align="center">
                <a href="${videoLink}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">🎥 Join Video Call</a>
              </td></tr>
            </table>
            ` : ''}
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr><td align="center">
                <a href="${viewUrl}" style="display: inline-block; background: ${headerGradient}; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px;">View in Calendar</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
            <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">This is an automated reminder from ${APP_NAME}.</p>
            <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error('Failed to send event reminder email:', error);
    throw new Error(`Failed to send event reminder email: ${error.message}`);
  }
  console.log('Event reminder email sent to:', to);
  return data;
}

// --- 3. Event Update Email ---
export interface SendEventUpdateEmailParams {
  to: string;
  recipientName?: string;
  organizerName: string;
  eventTitle: string;
  eventType: string;
  startTime: string;
  endTime: string;
  location?: string;
  videoLink?: string;
  clientName?: string;
  changes: string[]; // e.g. ["Time changed", "Location updated"]
  calendarUrl?: string;
}

export async function sendEventUpdateEmail({
  to,
  recipientName,
  organizerName,
  eventTitle,
  eventType,
  startTime,
  endTime,
  location,
  videoLink,
  clientName,
  changes,
  calendarUrl,
}: SendEventUpdateEmailParams) {
  const start = formatEventDateTime(startTime);
  const end = formatEventDateTime(endTime);
  const emoji = eventTypeEmoji(eventType);
  const viewUrl = calendarUrl || `${APP_URL}/dashboard/calendar`;
  const changesHtml = changes.map(c => `<li style="padding: 4px 0; color: #ea580c;">${c}</li>`).join('');

  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `🔄 Updated: "${eventTitle}" - ${APP_NAME}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <tr>
          <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🔄 ${APP_NAME}</h1>
            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Event Updated</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px;">
            <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">Hi ${recipientName || 'there'}!</h2>
            <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
              <strong>${organizerName}</strong> has updated the following event:
            </p>
            <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 20px; margin: 0 0 16px;">
              <h3 style="margin: 0 0 16px; color: #9a3412; font-size: 18px; font-weight: 600;">${emoji} ${eventTitle}</h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #9a3412; font-size: 14px;">📅 <strong>Date:</strong> ${start.date}</td></tr>
                <tr><td style="padding: 6px 0; color: #9a3412; font-size: 14px;">🕐 <strong>Time:</strong> ${start.time} – ${end.time}</td></tr>
                ${location ? `<tr><td style="padding: 6px 0; color: #9a3412; font-size: 14px;">📍 <strong>Location:</strong> ${location}</td></tr>` : ''}
                ${videoLink ? `<tr><td style="padding: 6px 0; color: #9a3412; font-size: 14px;">🔗 <strong>Video:</strong> <a href="${videoLink}" style="color: #ea580c; text-decoration: underline;">Join Meeting</a></td></tr>` : ''}
                ${clientName ? `<tr><td style="padding: 6px 0; color: #9a3412; font-size: 14px;">👤 <strong>Client:</strong> ${clientName}</td></tr>` : ''}
              </table>
            </div>
            <div style="background-color: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
              <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 600;">📝 What Changed:</p>
              <ul style="margin: 0; padding: 0 0 0 20px;">${changesHtml}</ul>
            </div>
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr><td align="center">
                <a href="${viewUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px;">View Updated Event</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
            <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">This is an automated notification from ${APP_NAME}.</p>
            <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error('Failed to send event update email:', error);
    throw new Error(`Failed to send event update email: ${error.message}`);
  }
  console.log('Event update email sent to:', to);
  return data;
}

// --- 4. Event Cancellation Email ---
export interface SendEventCancellationEmailParams {
  to: string;
  recipientName?: string;
  organizerName: string;
  eventTitle: string;
  eventType: string;
  startTime: string;
  clientName?: string;
}

export async function sendEventCancellationEmail({
  to,
  recipientName,
  organizerName,
  eventTitle,
  eventType,
  startTime,
  clientName,
}: SendEventCancellationEmailParams) {
  const start = formatEventDateTime(startTime);
  const emoji = eventTypeEmoji(eventType);

  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `❌ Cancelled: "${eventTitle}" - ${APP_NAME}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <tr>
          <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">❌ ${APP_NAME}</h1>
            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Event Cancelled</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px;">
            <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">Hi ${recipientName || 'there'},</h2>
            <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
              <strong>${organizerName}</strong> has cancelled the following event:
            </p>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
              <h3 style="margin: 0 0 12px; color: #991b1b; font-size: 18px; font-weight: 600; text-decoration: line-through;">${emoji} ${eventTitle}</h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #991b1b; font-size: 14px;">📅 <strong>Was scheduled:</strong> ${start.full}</td></tr>
                ${clientName ? `<tr><td style="padding: 6px 0; color: #991b1b; font-size: 14px;">👤 <strong>Client:</strong> ${clientName}</td></tr>` : ''}
              </table>
            </div>
            <p style="margin: 0; color: #71717a; font-size: 14px; text-align: center;">This event has been removed from your calendar.</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
            <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">This is an automated notification from ${APP_NAME}.</p>
            <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error('Failed to send event cancellation email:', error);
    throw new Error(`Failed to send event cancellation email: ${error.message}`);
  }
  console.log('Event cancellation email sent to:', to);
  return data;
}

// --- 5. Milestone Deadline Email ---
export interface SendMilestoneDeadlineEmailParams {
  to: string;
  brokerName: string;
  milestoneTitle: string;
  clientName: string;
  dueDate: string;
  priority?: string;
  description?: string;
  clientId: string;
}

export async function sendMilestoneDeadlineEmail({
  to,
  brokerName,
  milestoneTitle,
  clientName,
  dueDate,
  priority,
  description,
  clientId,
}: SendMilestoneDeadlineEmailParams) {
  const due = formatEventDateTime(dueDate);
  const caseUrl = `${APP_URL}/dashboard/clients/${clientId}`;

  const priorityBadge = priority === 'urgent'
    ? '<span style="background: #fef2f2; color: #991b1b; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">🔴 Urgent</span>'
    : priority === 'high'
    ? '<span style="background: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">🟠 High Priority</span>'
    : priority === 'medium'
    ? '<span style="background: #fffbeb; color: #d97706; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">🟡 Medium Priority</span>'
    : '<span style="background: #f0fdf4; color: #16a34a; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">🟢 Low Priority</span>';

  const urgencyPrefix = priority === 'urgent' ? '🚨 URGENT' : '🎯';

  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `${urgencyPrefix} Milestone Deadline: "${milestoneTitle}" for ${clientName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <tr>
          <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🎯 ${APP_NAME}</h1>
            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Milestone Deadline Notification</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px;">
            <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">Hi ${brokerName}!</h2>
            <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
              A milestone deadline is approaching for your case:
            </p>
            <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
              <h3 style="margin: 0 0 12px; color: #5b21b6; font-size: 18px; font-weight: 600;">🎯 ${milestoneTitle}</h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #5b21b6; font-size: 14px;">👤 <strong>Client:</strong> ${clientName}</td></tr>
                <tr><td style="padding: 6px 0; color: #5b21b6; font-size: 14px;">📅 <strong>Due Date:</strong> ${due.full}</td></tr>
                <tr><td style="padding: 8px 0;">${priorityBadge}</td></tr>
              </table>
              ${description ? `<p style="margin: 12px 0 0; color: #6d28d9; font-size: 13px; line-height: 1.5; border-top: 1px solid #ddd6fe; padding-top: 12px;">${description}</p>` : ''}
            </div>
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr><td align="center">
                <a href="${caseUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">View Case Details</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
            <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">This is an automated notification from ${APP_NAME}.</p>
            <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error('Failed to send milestone deadline email:', error);
    throw new Error(`Failed to send milestone deadline email: ${error.message}`);
  }
  console.log('Milestone deadline email sent to:', to);
  return data;
}

// --- 6. Event Confirmation Email (sent to event creator) ---
export interface SendEventConfirmationEmailParams {
  to: string;
  brokerName: string;
  eventTitle: string;
  eventType: string;
  startTime: string;
  endTime: string;
  location?: string;
  videoLink?: string;
  clientName?: string;
  attendeeCount: number;
}

export async function sendEventConfirmationEmail({
  to,
  brokerName,
  eventTitle,
  eventType,
  startTime,
  endTime,
  location,
  videoLink,
  clientName,
  attendeeCount,
}: SendEventConfirmationEmailParams) {
  const start = formatEventDateTime(startTime);
  const end = formatEventDateTime(endTime);
  const emoji = eventTypeEmoji(eventType);
  const typeLabel = eventTypeLabel(eventType);
  const viewUrl = `${APP_URL}/dashboard/calendar`;

  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `✅ ${typeLabel} Scheduled: "${eventTitle}"`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <tr>
          <td style="background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); padding: 40px 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">✅ ${APP_NAME}</h1>
            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">${typeLabel} Confirmed</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px;">
            <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">Hi ${brokerName}!</h2>
            <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
              Your <strong>${typeLabel.toLowerCase()}</strong> has been scheduled successfully.
            </p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
              <h3 style="margin: 0 0 16px; color: #166534; font-size: 18px; font-weight: 600;">${emoji} ${eventTitle}</h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #166534; font-size: 14px;">📅 <strong>Date:</strong> ${start.date}</td></tr>
                <tr><td style="padding: 6px 0; color: #166534; font-size: 14px;">🕐 <strong>Time:</strong> ${start.time} – ${end.time}</td></tr>
                ${location ? `<tr><td style="padding: 6px 0; color: #166534; font-size: 14px;">📍 <strong>Location:</strong> ${location}</td></tr>` : ''}
                ${videoLink ? `<tr><td style="padding: 6px 0; color: #166534; font-size: 14px;">🔗 <strong>Video:</strong> <a href="${videoLink}" style="color: #16a34a;">Join Meeting</a></td></tr>` : ''}
                ${clientName ? `<tr><td style="padding: 6px 0; color: #166534; font-size: 14px;">👤 <strong>Client:</strong> ${clientName}</td></tr>` : ''}
                ${attendeeCount > 0 ? `<tr><td style="padding: 6px 0; color: #166534; font-size: 14px;">👥 <strong>Attendees:</strong> ${attendeeCount} invited</td></tr>` : ''}
              </table>
            </div>
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr><td align="center">
                <a href="${viewUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px;">View Calendar</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
            <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">This is an automated confirmation from ${APP_NAME}.</p>
            <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error('Failed to send event confirmation email:', error);
    throw new Error(`Failed to send event confirmation email: ${error.message}`);
  }
  console.log('Event confirmation email sent to:', to);
  return data;
}

// ============================================================
// Collaboration Invite Email
// ============================================================

export interface SendCollaborationInviteEmailParams {
  to: string;
  invitedBrokerName: string;
  inviterName: string;
  clientName: string;
  clientId: string;
  role: string;
  roleDescription: string;
}

export async function sendCollaborationInviteEmail({
  to,
  invitedBrokerName,
  inviterName,
  clientName,
  clientId,
  role,
  roleDescription,
}: SendCollaborationInviteEmailParams) {
  const collaborationUrl = `${APP_URL}/dashboard/collaboration`;
  const caseUrl = `${APP_URL}/dashboard/clients/${clientId}`;

  console.log('Sending collaboration invite to:', to);
  console.log('From:', `${APP_NAME} <${FROM_EMAIL}>`);

  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `${inviterName} invited you to collaborate on a case - ${APP_NAME}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Collaboration Invite - ${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🤝 ${APP_NAME}
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                Case Collaboration Invite
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">
                Hi ${invitedBrokerName || 'there'}! 👋
              </h2>
              
              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                <strong>${inviterName}</strong> has invited you to collaborate on a case in ${APP_NAME}.
              </p>
              
              <!-- Case Details -->
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; color: #166534; font-size: 14px;">
                      📋 <strong>Case:</strong> ${clientName}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #166534; font-size: 14px;">
                      🏷️ <strong>Your Role:</strong> ${role}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #166534; font-size: 14px;">
                      📝 <strong>Role Description:</strong> ${roleDescription}
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Log in to your ${APP_NAME} dashboard to accept the invitation and start collaborating:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${collaborationUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">
                      View Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; color: #a1a1aa; font-size: 13px; text-align: center;">
                Or go directly to the case: <a href="${caseUrl}" style="color: #22c55e; text-decoration: underline;">Open Case</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                This is an automated message from ${APP_NAME}. 
                You received this because ${inviterName} added you as a collaborator.
              </p>
              <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    console.error('Failed to send collaboration invite email:', error);
    throw new Error(`Failed to send collaboration invite email: ${error.message}`);
  }

  console.log('Collaboration invite email sent successfully:', data);
  return data;
}

// ============================================================
// Broker Invitation Email (Signup)
// ============================================================

export interface SendInvitationEmailParams {
  to: string;
  brokerName: string;
  invitationToken: string;
  planName?: string;
  expiresAt: Date;
}

export async function sendBrokerInvitationEmail({
  to,
  brokerName,
  invitationToken,
  planName,
  expiresAt,
}: SendInvitationEmailParams) {
  const signupUrl = `${APP_URL}/signup?invitation=${invitationToken}`;
  const expiresFormatted = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  console.log('Sending email to:', to);
  console.log('From:', `${APP_NAME} <${FROM_EMAIL}>`);
  console.log('Signup URL:', signupUrl);

  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `You're invited to join ${APP_NAME}!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🚀 ${APP_NAME}
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                AI-Powered Client Onboarding
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">
                Hi ${brokerName || 'there'}! 👋
              </h2>
              
              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                You've been invited to join <strong>${APP_NAME}</strong> – the intelligent platform that streamlines your client onboarding with AI-powered automation.
              </p>
              
              ${planName ? `
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin: 0 0 24px;">
                <p style="margin: 0; color: #166534; font-size: 14px;">
                  🎁 <strong>Your Plan:</strong> ${planName}
                </p>
              </div>
              ` : ''}
              
              <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Click the button below to create your account and get started:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #a1a1aa; font-size: 13px; text-align: center;">
                This invitation expires on ${expiresFormatted}
              </p>
            </td>
          </tr>
          
          <!-- Features -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="background-color: #fafafa; border-radius: 12px; padding: 24px;">
                <h3 style="margin: 0 0 16px; color: #18181b; font-size: 16px; font-weight: 600;">
                  What you'll get with ${APP_NAME}:
                </h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ Customizable onboarding forms
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ AI-powered document extraction
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ Automated client notifications
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ Secure document storage
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 8px; color: #71717a; font-size: 12px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

export interface SendOnboardingEmailParams {
  to: string;
  clientName: string;
  brokerName: string;
  onboardingLink: string;
  formName?: string;
}

export async function sendClientOnboardingEmail({
  to,
  clientName,
  brokerName,
  onboardingLink,
  formName,
}: SendOnboardingEmailParams) {
  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `${brokerName} has invited you to complete your onboarding`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Complete Your Onboarding</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #18181b; font-size: 18px;">
                Hi ${clientName}! 👋
              </p>
              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                <strong>${brokerName}</strong> has invited you to complete your onboarding${formName ? ` using the <strong>${formName}</strong> form` : ''}.
              </p>
              <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Please click the button below to get started:
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${onboardingLink}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px;">
                      Start Onboarding
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                This is an automated message from ${APP_NAME}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

export async function sendSubscriptionConfirmationEmail({
  to,
  brokerName,
  planName,
  tokensAllocated,
}: {
  to: string;
  brokerName: string;
  planName: string;
  tokensAllocated: number;
}) {
  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `Welcome to ${APP_NAME}! Your subscription is active 🎉`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">🎉 Subscription Confirmed!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #18181b; font-size: 18px;">
                Welcome, ${brokerName}!
              </p>
              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Your <strong>${planName}</strong> subscription is now active. Here's what you've unlocked:
              </p>
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                <p style="margin: 0; color: #166534; font-size: 24px; font-weight: 700; text-align: center;">
                  ${tokensAllocated === -1 ? '∞ Unlimited' : tokensAllocated.toLocaleString()} Tokens
                </p>
                <p style="margin: 8px 0 0; color: #166534; font-size: 14px; text-align: center;">
                  Available this month
                </p>
              </div>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                Thank you for choosing ${APP_NAME}!
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

// Send notification to broker when client completes onboarding
export async function sendClientOnboardingCompleteEmail({
  to,
  brokerName,
  clientName,
  clientEmail,
  documentsCount,
  hasAiExtraction,
  clientViewUrl,
}: {
  to: string;
  brokerName: string;
  clientName: string;
  clientEmail: string;
  documentsCount: number;
  hasAiExtraction: boolean;
  clientViewUrl: string;
}) {
  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `✅ ${clientName} completed their onboarding!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">✅ Onboarding Complete!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #18181b; font-size: 18px;">
                Hi ${brokerName}! 👋
              </p>
              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Great news! <strong>${clientName}</strong> has completed their onboarding form.
              </p>
              
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                <h3 style="margin: 0 0 12px; color: #166534; font-size: 16px;">📋 Submission Summary</h3>
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0; color: #52525b;">Client Name:</td>
                    <td style="padding: 8px 0; color: #18181b; font-weight: 600;">${clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b;">Email:</td>
                    <td style="padding: 8px 0; color: #18181b; font-weight: 600;">${clientEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b;">Documents Uploaded:</td>
                    <td style="padding: 8px 0; color: #18181b; font-weight: 600;">${documentsCount}</td>
                  </tr>
                  ${hasAiExtraction ? `
                  <tr>
                    <td style="padding: 8px 0; color: #52525b;">AI Processing:</td>
                    <td style="padding: 8px 0; color: #16a34a; font-weight: 600;">✨ Data extracted from documents</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Click below to view all the submitted information and AI-extracted data:
              </p>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${clientViewUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px;">
                      View Client Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                This is an automated notification from ${APP_NAME}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

// Broker Referral Email
export interface SendBrokerReferralEmailParams {
  to: string;
  referredName: string;
  referrerName: string;
  referralToken: string;
  expiresAt: Date;
}

export async function sendBrokerReferralEmail({
  to,
  referredName,
  referrerName,
  referralToken,
  expiresAt,
}: SendBrokerReferralEmailParams) {
  const signupUrl = `${APP_URL}/signup?ref=${referralToken}`;
  const expiresFormatted = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `${referrerName} invites you to join ${APP_NAME}!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join ${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🎉 You've Been Invited!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                Join ${APP_NAME} - AI-Powered Client Onboarding
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">
                Hi ${referredName}! 👋
              </h2>
              
              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                <strong>${referrerName}</strong> thinks you'd love ${APP_NAME} – the intelligent platform that streamlines client onboarding with AI-powered automation.
              </p>
              
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                <p style="margin: 0; color: #166534; font-size: 16px; text-align: center;">
                  🎁 <strong>Special Referral Invitation</strong>
                </p>
                <p style="margin: 10px 0 0; color: #15803d; font-size: 14px; text-align: center;">
                  Sign up now and start streamlining your client onboarding process!
                </p>
              </div>
              
              <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Click the button below to create your account and get started:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">
                      Accept Invitation & Sign Up
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #a1a1aa; font-size: 13px; text-align: center;">
                This invitation expires on ${expiresFormatted}
              </p>
            </td>
          </tr>
          
          <!-- Features -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="background-color: #fafafa; border-radius: 12px; padding: 24px;">
                <h3 style="margin: 0 0 16px; color: #18181b; font-size: 16px; font-weight: 600;">
                  What you'll get with ${APP_NAME}:
                </h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ Customizable onboarding forms
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ AI-powered document extraction
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ Automated client notifications
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ Secure document storage
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #52525b; font-size: 14px;">
                      ✅ Free tier with 150 tokens/month
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 8px; color: #71717a; font-size: 12px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send referral email: ${error.message}`);
  }

  return data;
}

// ============================================================
// Affiliate New Signup Notification Email
// ============================================================

export interface SendAffiliateSignupNotificationParams {
  to: string;
  affiliateName: string;
  referredName: string;
  referredEmail: string;
  planName?: string;
  commissionRate: number;
  monthlyCommission?: number;
}

export async function sendAffiliateSignupNotificationEmail({
  to,
  affiliateName,
  referredName,
  referredEmail,
  planName,
  commissionRate,
  monthlyCommission,
}: SendAffiliateSignupNotificationParams) {
  const dashboardUrl = `${APP_URL}/affiliate`;

  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `🎉 New Referral Signup: ${referredName || referredEmail} just joined!`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <tr>
          <td style="background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); padding: 40px 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🎉 ${APP_NAME}</h1>
            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">New Referral Signup!</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px;">
            <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">Great news, ${affiliateName}! 🎊</h2>
            <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
              Someone just signed up through your referral link!
            </p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
              <h3 style="margin: 0 0 16px; color: #166534; font-size: 16px; font-weight: 600;">📋 New Signup Details</h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #166534; font-size: 14px;">👤 <strong>Name:</strong> ${referredName || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #166534; font-size: 14px;">📧 <strong>Email:</strong> ${referredEmail}</td>
                </tr>
                ${planName ? `<tr><td style="padding: 6px 0; color: #166534; font-size: 14px;">📦 <strong>Plan:</strong> ${planName}</td></tr>` : ''}
              </table>
            </div>
            ${monthlyCommission && monthlyCommission > 0 ? `
            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; margin: 0 0 24px; text-align: center;">
              <p style="margin: 0 0 4px; color: #92400e; font-size: 14px;">💰 Your Recurring Commission (${commissionRate}%)</p>
              <p style="margin: 0; color: #d97706; font-size: 32px; font-weight: 700;">$${monthlyCommission.toFixed(2)}/mo</p>
            </div>
            ` : `
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin: 0 0 24px; text-align: center;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">💰 You'll earn <strong>${commissionRate}% recurring commission</strong> when they subscribe to a paid plan.</p>
            </div>
            `}
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr><td align="center">
                <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">View Affiliate Dashboard</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
            <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">Keep sharing your referral link to earn more commissions!</p>
            <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error('Failed to send affiliate signup notification:', error);
    throw new Error(`Failed to send affiliate signup notification: ${error.message}`);
  }
  console.log('Affiliate signup notification sent to:', to);
  return data;
}

// ============================================================
// Broker Referral Success Notification Email
// ============================================================

export interface SendReferralSuccessNotificationParams {
  to: string;
  referrerName: string;
  referredName: string;
  referredEmail: string;
  tokensAwarded: number;
}

export async function sendReferralSuccessNotificationEmail({
  to,
  referrerName,
  referredName,
  referredEmail,
  tokensAwarded,
}: SendReferralSuccessNotificationParams) {
  const dashboardUrl = `${APP_URL}/dashboard/referrals`;

  const { data, error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject: `🎉 ${referredName || referredEmail} joined via your referral! +${tokensAwarded} tokens`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr><td align="center" style="padding: 40px 0;">
      <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <tr>
          <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🎉 ${APP_NAME}</h1>
            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Referral Successful!</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px;">
            <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">Awesome, ${referrerName}! 🎊</h2>
            <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
              Your referral just signed up and you've earned bonus tokens!
            </p>
            <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #5b21b6; font-size: 14px;">👤 <strong>New User:</strong> ${referredName || 'A new broker'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #5b21b6; font-size: 14px;">📧 <strong>Email:</strong> ${referredEmail}</td>
                </tr>
              </table>
            </div>
            <div style="background-color: #fefce8; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; margin: 0 0 24px; text-align: center;">
              <p style="margin: 0 0 4px; color: #92400e; font-size: 14px;">🪙 Tokens Awarded</p>
              <p style="margin: 0; color: #d97706; font-size: 36px; font-weight: 700;">+${tokensAwarded}</p>
              <p style="margin: 8px 0 0; color: #92400e; font-size: 13px;">Added to your balance</p>
            </div>
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr><td align="center">
                <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">View Referrals</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
            <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">Keep referring brokers to earn more tokens!</p>
            <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error('Failed to send referral success notification:', error);
    throw new Error(`Failed to send referral success notification: ${error.message}`);
  }
  console.log('Referral success notification sent to:', to);
  return data;
}
