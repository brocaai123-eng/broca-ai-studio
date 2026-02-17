"use client";

import { Calendar, Clock, Users, Phone, AlertCircle, Bell, Target, Video, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUpcomingEvents } from "@/lib/hooks/use-calendar";
import { EVENT_TYPE_CONFIG, type EventType } from "@/lib/types/calendar";
import { format, parseISO, isToday, isTomorrow, isThisWeek, differenceInMinutes } from "date-fns";
import Link from "next/link";

const eventTypeIcons: Record<EventType, React.ElementType> = {
  meeting: Users,
  call: Phone,
  deadline: AlertCircle,
  reminder: Bell,
  milestone: Target,
};

export default function UpcomingEventsWidget() {
  const { data, isLoading } = useUpcomingEvents(7);
  const events = data?.events || [];

  // Group events by relative date
  const grouped = events.reduce((acc, event) => {
    const eventDate = parseISO(event.start_time);
    let group: string;
    if (isToday(eventDate)) {
      group = "Today";
    } else if (isTomorrow(eventDate)) {
      group = "Tomorrow";
    } else if (isThisWeek(eventDate)) {
      group = format(eventDate, "EEEE"); // Day name
    } else {
      group = format(eventDate, "MMM d"); // Date
    }
    if (!acc[group]) acc[group] = [];
    acc[group].push(event);
    return acc;
  }, {} as Record<string, typeof events>);

  // Count summary
  const todayCount = events.filter(e => isToday(parseISO(e.start_time))).length;
  const thisWeekCount = events.length;

  // Check if any event is soon (within 30 minutes)
  const soonEvent = events.find(e => {
    const diff = differenceInMinutes(parseISO(e.start_time), new Date());
    return diff >= 0 && diff <= 30;
  });

  if (isLoading) {
    return (
      <Card className="app-card h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-app-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="app-card h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-app-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Upcoming Events
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link href="/dashboard/calendar">
              View All <ChevronRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
        {/* Quick stats */}
        <div className="flex items-center gap-4 text-xs text-app-muted mt-2">
          <span><span className="font-semibold text-app-foreground">{todayCount}</span> today</span>
          <span><span className="font-semibold text-app-foreground">{thisWeekCount}</span> this week</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Urgent alert for soon events */}
        {soonEvent && (
          <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">Starting soon</span>
            </div>
            <p className="text-sm text-app-foreground mt-1 font-medium">{soonEvent.title}</p>
            <p className="text-xs text-app-muted">
              {format(parseISO(soonEvent.start_time), "h:mm a")}
              {(soonEvent as any).video_link && (
                <a
                  href={(soonEvent as any).video_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Video className="w-3 h-3" /> Join
                </a>
              )}
            </p>
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="w-10 h-10 text-app-muted mx-auto mb-3" />
            <p className="text-sm text-app-muted">No upcoming events</p>
            <Button size="sm" variant="outline" asChild className="mt-3">
              <Link href="/dashboard/calendar">Schedule Something</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([groupLabel, groupEvents]) => (
              <div key={groupLabel}>
                <p className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-2">
                  {groupLabel}
                </p>
                <div className="space-y-2">
                  {groupEvents.map((event) => {
                    const config = EVENT_TYPE_CONFIG[event.event_type];
                    const Icon = eventTypeIcons[event.event_type];
                    return (
                      <Link
                        key={event.id}
                        href="/dashboard/calendar"
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-app-foreground truncate group-hover:text-primary transition-colors">
                            {event.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-app-muted">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(event.start_time), "h:mm a")}
                            {event.client && (
                              <>
                                <span className="text-app-muted">•</span>
                                <span className="truncate">{event.client.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${config.bgColor} ${config.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          {config.label}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
