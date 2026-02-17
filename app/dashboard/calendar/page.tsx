"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Users,
  Phone,
  AlertCircle,
  Bell,
  Target,
  MapPin,
  Video,
  Trash2,
  Pencil,
  CheckCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  useCalendarEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useCompleteEvent,
} from "@/lib/hooks/use-calendar";
import {
  EVENT_TYPE_CONFIG,
  DURATION_PRESETS,
  REMINDER_PRESETS,
  type CalendarEvent,
  type EventType,
  type CalendarView,
  type EventReminder,
  calculateEndTime,
  getDurationMinutes,
  formatReminderText,
} from "@/lib/types/calendar";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  setHours,
  setMinutes,
} from "date-fns";
import { toast } from "sonner";

// Event type icons
const eventTypeIcons: Record<EventType, React.ElementType> = {
  meeting: Users,
  call: Phone,
  deadline: AlertCircle,
  reminder: Bell,
  milestone: Target,
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formDuration, setFormDuration] = useState(30);
  const [formType, setFormType] = useState<EventType>("meeting");
  const [formVideoLink, setFormVideoLink] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formReminders, setFormReminders] = useState<EventReminder[]>([
    { type: "email", minutes_before: 30 },
  ]);

  // Calculate date range for API query
  const dateRange = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return { start: start.toISOString(), end: end.toISOString() };
    } else if (view === "week") {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return { start: start.toISOString(), end: end.toISOString() };
    } else {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
  }, [currentDate, view]);

  const { data: eventsData, isLoading } = useCalendarEvents(dateRange.start, dateRange.end);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const completeEvent = useCompleteEvent();

  const events: CalendarEvent[] = eventsData?.events || [];

  // Navigation handlers
  const goToToday = () => setCurrentDate(new Date());
  const goBack = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, -1));
  };
  const goForward = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter((event) => {
      const eventDate = parseISO(event.start_time);
      return isSameDay(eventDate, date);
    });
  };

  // Open event form for a specific date
  const openNewEventForm = (date: Date) => {
    setEditingEvent(null);
    setFormTitle("");
    setFormDescription("");
    setFormDate(format(date, "yyyy-MM-dd"));
    setFormTime("09:00");
    setFormDuration(30);
    setFormType("meeting");
    setFormVideoLink("");
    setFormLocation("");
    setFormReminders([{ type: "email", minutes_before: 30 }]);
    setShowEventDialog(true);
  };

  // Open event form for editing
  const openEditEventForm = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDescription(event.description || "");
    setFormDate(format(parseISO(event.start_time), "yyyy-MM-dd"));
    setFormTime(format(parseISO(event.start_time), "HH:mm"));
    setFormDuration(getDurationMinutes(event.start_time, event.end_time));
    setFormType(event.event_type);
    setFormVideoLink(event.video_link || "");
    setFormLocation(event.location || "");
    setFormReminders(event.reminders || []);
    setSelectedEvent(null);
    setShowEventDialog(true);
  };

  // Submit event form
  const handleSubmitEvent = async () => {
    if (!formTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!formDate || !formTime) {
      toast.error("Date and time are required");
      return;
    }

    const [hours, minutes] = formTime.split(":").map(Number);
    const startDate = setMinutes(setHours(new Date(formDate), hours), minutes);
    const endDate = new Date(startDate.getTime() + formDuration * 60 * 1000);

    try {
      if (editingEvent) {
        await updateEvent.mutateAsync({
          id: editingEvent.id,
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          event_type: formType,
          video_link: formVideoLink.trim() || undefined,
          location: formLocation.trim() || undefined,
          reminders: formReminders,
        });
        toast.success("Event updated");
      } else {
        await createEvent.mutateAsync({
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          event_type: formType,
          video_link: formVideoLink.trim() || undefined,
          location: formLocation.trim() || undefined,
          reminders: formReminders,
        });
        toast.success("Event created");
      }
      setShowEventDialog(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save event";
      toast.error(message);
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteEvent.mutateAsync(eventId);
      toast.success("Event deleted");
      setSelectedEvent(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete event";
      toast.error(message);
    }
  };

  // Complete event
  const handleCompleteEvent = async (eventId: string) => {
    try {
      await completeEvent.mutateAsync(eventId);
      toast.success("Event marked as complete");
      setSelectedEvent(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to complete event";
      toast.error(message);
    }
  };

  // Generate calendar grid for month view
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  // Generate days for week view
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }, [currentDate]);

  // Title for navigation
  const navigationTitle = useMemo(() => {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMMM d, yyyy");
  }, [currentDate, view]);

  return (
    <DashboardLayout title="Calendar" subtitle="Schedule meetings, track deadlines, and manage your time">
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-app-foreground flex items-center gap-2">
                <Calendar className="w-7 h-7 text-primary" />
                Calendar
              </h1>
              <p className="text-app-muted">Schedule meetings, track deadlines, and manage your time</p>
            </div>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => openNewEventForm(new Date())}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Event
            </Button>
          </div>

          {/* Navigation & View Controls */}
          <Card className="app-card">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Navigation */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <div className="flex items-center border border-app rounded-lg">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="px-3 text-sm font-medium text-app-foreground min-w-[180px] text-center">
                      {navigationTitle}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goForward}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* View Tabs */}
                <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
                  <TabsList>
                    <TabsTrigger value="month">Month</TabsTrigger>
                    <TabsTrigger value="week">Week</TabsTrigger>
                    <TabsTrigger value="day">Day</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Grid */}
          {isLoading ? (
            <Card className="app-card">
              <CardContent className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : view === "month" ? (
            <MonthView
              days={monthDays}
              currentDate={currentDate}
              events={events}
              onDateClick={(date) => {
                setSelectedDate(date);
                setCurrentDate(date);
              }}
              onDateDoubleClick={openNewEventForm}
              onEventClick={setSelectedEvent}
            />
          ) : view === "week" ? (
            <WeekView
              days={weekDays}
              events={events}
              onDateClick={(date) => setCurrentDate(date)}
              onDateDoubleClick={openNewEventForm}
              onEventClick={setSelectedEvent}
            />
          ) : (
            <DayView
              date={currentDate}
              events={getEventsForDate(currentDate)}
              onNewEvent={() => openNewEventForm(currentDate)}
              onEventClick={setSelectedEvent}
            />
          )}
        </div>

        {/* Event Details Dialog */}
        <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent className="max-w-md">
            {selectedEvent && (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${EVENT_TYPE_CONFIG[selectedEvent.event_type].bgColor}`}>
                      {(() => {
                        const Icon = eventTypeIcons[selectedEvent.event_type];
                        return <Icon className={`w-5 h-5 ${EVENT_TYPE_CONFIG[selectedEvent.event_type].color}`} />;
                      })()}
                    </div>
                    <div>
                      <DialogTitle className="text-left">{selectedEvent.title}</DialogTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${EVENT_TYPE_CONFIG[selectedEvent.event_type].bgColor} ${EVENT_TYPE_CONFIG[selectedEvent.event_type].color}`}>
                          {EVENT_TYPE_CONFIG[selectedEvent.event_type].label}
                        </Badge>
                        {selectedEvent.status === "completed" && (
                          <Badge className="bg-green-100 text-green-700 text-xs">Completed</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {/* Date & Time */}
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-app-muted" />
                    <div>
                      <p className="text-app-foreground font-medium">
                        {format(parseISO(selectedEvent.start_time), "EEEE, MMMM d, yyyy")}
                      </p>
                      <p className="text-app-muted">
                        {format(parseISO(selectedEvent.start_time), "h:mm a")} - {format(parseISO(selectedEvent.end_time), "h:mm a")}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedEvent.description && (
                    <p className="text-sm text-app-muted">{selectedEvent.description}</p>
                  )}

                  {/* Location */}
                  {selectedEvent.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-app-muted" />
                      <span className="text-app-foreground">{selectedEvent.location}</span>
                    </div>
                  )}

                  {/* Video Link */}
                  {selectedEvent.video_link && (
                    <div className="flex items-center gap-3 text-sm">
                      <Video className="w-4 h-4 text-app-muted" />
                      <a
                        href={selectedEvent.video_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        Join meeting <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Client */}
                  {selectedEvent.client && (
                    <div className="flex items-center gap-3 text-sm">
                      <Users className="w-4 h-4 text-app-muted" />
                      <span className="text-app-foreground">{selectedEvent.client.name}</span>
                    </div>
                  )}

                  {/* Reminders */}
                  {selectedEvent.reminders && selectedEvent.reminders.length > 0 && (
                    <div className="flex items-start gap-3 text-sm">
                      <Bell className="w-4 h-4 text-app-muted mt-0.5" />
                      <div>
                        {selectedEvent.reminders.map((r, i) => (
                          <p key={i} className="text-app-muted">
                            {formatReminderText(r.minutes_before)} ({r.type})
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {selectedEvent.status !== "completed" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditEventForm(selectedEvent)}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200"
                        onClick={() => handleCompleteEvent(selectedEvent.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => handleDeleteEvent(selectedEvent.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Create/Edit Event Dialog */}
        <Dialog open={showEventDialog} onOpenChange={(open) => { if (!open) { setShowEventDialog(false); setEditingEvent(null); } }}>
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit Event" : "New Event"}</DialogTitle>
              <DialogDescription>
                {editingEvent ? "Update event details" : "Create a new calendar event"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2 overflow-y-auto pr-2 flex-1 custom-scrollbar">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="event-title">Title *</Label>
                <Input
                  id="event-title"
                  placeholder="e.g., Call with John Smith"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-date">Date *</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-time">Time *</Label>
                  <Input
                    id="event-time"
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Duration & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={String(formDuration)} onValueChange={(v) => setFormDuration(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_PRESETS.map((d) => (
                        <SelectItem key={d.minutes} value={String(d.minutes)}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as EventType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(EVENT_TYPE_CONFIG) as [EventType, typeof EVENT_TYPE_CONFIG[EventType]][]).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="event-desc">Description</Label>
                <Textarea
                  id="event-desc"
                  placeholder="Add details..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Video Link */}
              <div className="space-y-2">
                <Label htmlFor="event-video">Video Link (Zoom, Meet, etc.)</Label>
                <Input
                  id="event-video"
                  type="url"
                  placeholder="https://zoom.us/j/..."
                  value={formVideoLink}
                  onChange={(e) => setFormVideoLink(e.target.value)}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="event-location">Location</Label>
                <Input
                  id="event-location"
                  placeholder="Office, Virtual, etc."
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                />
              </div>

              {/* Reminder */}
              <div className="space-y-2">
                <Label>Reminder</Label>
                <Select
                  value={String(formReminders[0]?.minutes_before || 30)}
                  onValueChange={(v) => setFormReminders([{ type: "email", minutes_before: Number(v) }])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_PRESETS.map((r) => (
                      <SelectItem key={r.minutes} value={String(r.minutes)}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowEventDialog(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleSubmitEvent}
                  disabled={createEvent.isPending || updateEvent.isPending}
                >
                  {(createEvent.isPending || updateEvent.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingEvent ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </DashboardLayout>
  );
}

// ============================================================
// MONTH VIEW COMPONENT
// ============================================================

function MonthView({
  days,
  currentDate,
  events,
  onDateClick,
  onDateDoubleClick,
  onEventClick,
}: {
  days: Date[];
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onDateDoubleClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter((event) => {
      const eventDate = parseISO(event.start_time);
      return isSameDay(eventDate, date);
    });
  };

  return (
    <Card className="app-card overflow-hidden">
      <CardContent className="p-0">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-app bg-gray-50 dark:bg-gray-900">
          {weekDays.map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-app-muted">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={index}
                className={`min-h-[100px] border-b border-r border-app p-1 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 ${
                  !isCurrentMonth ? "bg-gray-50/50 dark:bg-gray-900/50" : ""
                }`}
                onClick={() => onDateClick(day)}
                onDoubleClick={() => onDateDoubleClick(day)}
              >
                <div className={`text-sm mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                  isCurrentDay
                    ? "bg-primary text-primary-foreground font-bold"
                    : isCurrentMonth
                    ? "text-app-foreground"
                    : "text-app-muted"
                }`}>
                  {format(day, "d")}
                </div>

                {/* Events */}
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => {
                    const config = EVENT_TYPE_CONFIG[event.event_type];
                    return (
                      <div
                        key={event.id}
                        className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer ${config.bgColor} ${config.color} ${
                          event.status === "completed" ? "opacity-50 line-through" : ""
                        }`}
                        onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                        title={event.title}
                      >
                        {format(parseISO(event.start_time), "h:mm")} {event.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-app-muted px-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// WEEK VIEW COMPONENT
// ============================================================

function WeekView({
  days,
  events,
  onDateClick,
  onDateDoubleClick,
  onEventClick,
}: {
  days: Date[];
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onDateDoubleClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter((event) => {
      const eventDate = parseISO(event.start_time);
      return isSameDay(eventDate, date);
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  return (
    <Card className="app-card overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={index}
                className={`min-h-[300px] border-r border-app last:border-r-0 ${
                  isCurrentDay ? "bg-primary/5" : ""
                }`}
              >
                {/* Day header */}
                <div
                  className="p-3 text-center border-b border-app cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                  onClick={() => onDateClick(day)}
                  onDoubleClick={() => onDateDoubleClick(day)}
                >
                  <p className="text-xs text-app-muted">{format(day, "EEE")}</p>
                  <p className={`text-lg font-semibold ${
                    isCurrentDay ? "text-primary" : "text-app-foreground"
                  }`}>
                    {format(day, "d")}
                  </p>
                </div>

                {/* Events */}
                <div className="p-1 space-y-1">
                  {dayEvents.map((event) => {
                    const config = EVENT_TYPE_CONFIG[event.event_type];
                    const Icon = eventTypeIcons[event.event_type];
                    return (
                      <div
                        key={event.id}
                        className={`p-2 rounded-lg cursor-pointer text-xs ${config.bgColor} ${config.color} ${
                          event.status === "completed" ? "opacity-50" : ""
                        }`}
                        onClick={() => onEventClick(event)}
                      >
                        <div className="flex items-center gap-1 font-medium">
                          <Icon className="w-3 h-3" />
                          {format(parseISO(event.start_time), "h:mm a")}
                        </div>
                        <p className={`truncate mt-0.5 ${event.status === "completed" ? "line-through" : ""}`}>
                          {event.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// DAY VIEW COMPONENT
// ============================================================

function DayView({
  date,
  events,
  onNewEvent,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  onNewEvent: () => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  return (
    <Card className="app-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {isToday(date) ? "Today" : format(date, "EEEE")}
            </CardTitle>
            <p className="text-sm text-app-muted">{format(date, "MMMM d, yyyy")}</p>
          </div>
          <Button size="sm" onClick={onNewEvent}>
            <Plus className="w-4 h-4 mr-1" />
            Add Event
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-app-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-app-foreground mb-2">No Events</h3>
            <p className="text-app-muted mb-4">You have no events scheduled for this day.</p>
            <Button onClick={onNewEvent}>
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEvents.map((event) => {
              const config = EVENT_TYPE_CONFIG[event.event_type];
              const Icon = eventTypeIcons[event.event_type];
              return (
                <div
                  key={event.id}
                  className={`flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-all border ${config.bgColor} hover:shadow-md ${
                    event.status === "completed" ? "opacity-60" : ""
                  }`}
                  onClick={() => onEventClick(event)}
                >
                  <div className={`p-2 rounded-lg bg-white/50 ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium text-app-foreground ${event.status === "completed" ? "line-through" : ""}`}>
                        {event.title}
                      </p>
                      {event.status === "completed" && (
                        <Badge className="bg-green-100 text-green-700 text-xs">Done</Badge>
                      )}
                    </div>
                    <p className="text-sm text-app-muted mt-0.5">
                      {format(parseISO(event.start_time), "h:mm a")} - {format(parseISO(event.end_time), "h:mm a")}
                    </p>
                    {event.description && (
                      <p className="text-sm text-app-muted mt-1 line-clamp-2">{event.description}</p>
                    )}
                    {event.client && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-app-muted">
                        <Users className="w-3 h-3" />
                        {event.client.name}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
