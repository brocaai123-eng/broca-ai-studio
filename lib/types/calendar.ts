// TypeScript types for Calendar Integration

export type EventType = 'meeting' | 'call' | 'deadline' | 'reminder' | 'milestone';
export type EventStatus = 'scheduled' | 'completed' | 'cancelled';
export type AttendeeStatus = 'pending' | 'accepted' | 'declined';
export type ReminderType = 'email' | 'browser';
export type CalendarView = 'month' | 'week' | 'day';

export interface EventAttendee {
  email: string;
  name?: string;
  status: AttendeeStatus;
}

export interface EventReminder {
  type: ReminderType;
  minutes_before: number;
}

export interface CalendarEvent {
  id: string;
  broker_id: string;
  
  // Basic info
  title: string;
  description: string | null;
  
  // Date/Time
  start_time: string;
  end_time: string;
  all_day: boolean;
  timezone: string;
  
  // Type and links
  event_type: EventType;
  client_id: string | null;
  milestone_id: string | null;
  video_link: string | null;
  location: string | null;
  
  // Attendees and reminders
  attendees: EventAttendee[];
  reminders: EventReminder[];
  
  // Status
  status: EventStatus;
  completed_at: string | null;
  
  // Metadata
  color: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  client?: {
    id: string;
    name: string;
  };
  milestone?: {
    id: string;
    title: string;
  };
}

export interface CreateEventInput {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  event_type: EventType;
  client_id?: string;
  milestone_id?: string;
  video_link?: string;
  location?: string;
  attendees?: EventAttendee[];
  reminders?: EventReminder[];
  color?: string;
  notes?: string;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  id: string;
  status?: EventStatus;
}

// Event type configuration for display
export const EVENT_TYPE_CONFIG: Record<EventType, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  meeting: {
    label: 'Meeting',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-200',
    icon: 'Users',
  },
  call: {
    label: 'Call',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-200',
    icon: 'Phone',
  },
  deadline: {
    label: 'Deadline',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-200',
    icon: 'AlertCircle',
  },
  reminder: {
    label: 'Reminder',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100 border-amber-200',
    icon: 'Bell',
  },
  milestone: {
    label: 'Milestone',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100 border-purple-200',
    icon: 'Target',
  },
};

// Reminder presets
export const REMINDER_PRESETS: { label: string; minutes: number }[] = [
  { label: 'At time of event', minutes: 0 },
  { label: '5 minutes before', minutes: 5 },
  { label: '15 minutes before', minutes: 15 },
  { label: '30 minutes before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '2 hours before', minutes: 120 },
  { label: '1 day before', minutes: 1440 },
  { label: '2 days before', minutes: 2880 },
  { label: '1 week before', minutes: 10080 },
];

// Duration presets (in minutes)
export const DURATION_PRESETS: { label: string; minutes: number }[] = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '1.5 hours', minutes: 90 },
  { label: '2 hours', minutes: 120 },
  { label: '3 hours', minutes: 180 },
  { label: 'All day', minutes: 1440 },
];

// Helper to format reminder text
export function formatReminderText(minutes: number): string {
  if (minutes === 0) return 'At time of event';
  if (minutes < 60) return `${minutes} minutes before`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hour${minutes >= 120 ? 's' : ''} before`;
  const days = Math.round(minutes / 1440);
  return `${days} day${days > 1 ? 's' : ''} before`;
}

// Helper to calculate end time from start and duration
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const start = new Date(startTime);
  return new Date(start.getTime() + durationMinutes * 60 * 1000).toISOString();
}

// Helper to get duration in minutes between two times
export function getDurationMinutes(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.round((end.getTime() - start.getTime()) / (60 * 1000));
}
