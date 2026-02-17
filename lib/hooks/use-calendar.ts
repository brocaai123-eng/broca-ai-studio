import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/supabase/auth-context';
import type { CalendarEvent, CreateEventInput, UpdateEventInput } from '@/lib/types/calendar';

// ============================================================
// CALENDAR EVENTS
// ============================================================

// Fetch events for a date range
export function useCalendarEvents(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['calendar-events', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      const res = await fetch(`/api/calendar?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch calendar events');
      return res.json() as Promise<{ events: CalendarEvent[] }>;
    },
    enabled: !!user,
  });
}

// Fetch a single event by ID
export function useCalendarEvent(eventId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['calendar-event', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/${eventId}`);
      if (!res.ok) throw new Error('Failed to fetch event');
      return res.json() as Promise<{ event: CalendarEvent }>;
    },
    enabled: !!user && !!eventId,
  });
}

// Create a new event
export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEventInput) => {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create event');
      }
      return res.json() as Promise<{ event: CalendarEvent }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
    },
  });
}

// Update an existing event
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateEventInput) => {
      const res = await fetch(`/api/calendar/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update event');
      }
      return res.json() as Promise<{ event: CalendarEvent }>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-event', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
    },
  });
}

// Delete an event
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/calendar/${eventId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete event');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
    },
  });
}

// Mark event as completed
export function useCompleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/calendar/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, status: 'completed' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to complete event');
      }
      return res.json() as Promise<{ event: CalendarEvent }>;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
    },
  });
}

// ============================================================
// UPCOMING EVENTS (for dashboard widget)
// ============================================================

export function useUpcomingEvents(limit: number = 10) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['upcoming-events', limit],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/upcoming?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch upcoming events');
      return res.json() as Promise<{ events: CalendarEvent[] }>;
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });
}

// ============================================================
// MILESTONE CALENDAR SYNC
// ============================================================

// Create calendar event from a milestone
export function useCreateEventFromMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (milestoneId: string) => {
      const res = await fetch('/api/calendar/from-milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create event from milestone');
      }
      return res.json() as Promise<{ event: CalendarEvent }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
    },
  });
}

// ============================================================
// QUICK SCHEDULE (from client page)
// ============================================================

export function useQuickSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      clientId: string;
      title: string;
      start_time: string;
      duration_minutes: number;
      event_type?: string;
      video_link?: string;
      notes?: string;
    }) => {
      const res = await fetch('/api/calendar/quick-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to schedule meeting');
      }
      return res.json() as Promise<{ event: CalendarEvent }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
    },
  });
}
