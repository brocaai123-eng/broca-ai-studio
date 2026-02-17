"use client";

import {
  MessageSquare,
  UserPlus,
  Target,
  CheckCircle2,
  FileText,
  ArrowRightLeft,
  Shield,
  UserMinus,
  AtSign,
  Clock,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTeamFeed } from "@/lib/hooks/use-collaboration";
import type { TeamFeedItem, TimelineEntryType } from "@/lib/types/collaboration";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Loader2 } from "lucide-react";

const feedTypeConfig: Record<TimelineEntryType, {
  icon: React.ElementType;
  color: string;
}> = {
  comment: { icon: MessageSquare, color: "bg-blue-100 text-blue-600" },
  mention: { icon: AtSign, color: "bg-purple-100 text-purple-600" },
  milestone_created: { icon: Target, color: "bg-green-100 text-green-600" },
  milestone_completed: { icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
  document_uploaded: { icon: FileText, color: "bg-blue-100 text-blue-600" },
  document_verified: { icon: Shield, color: "bg-green-100 text-green-600" },
  status_change: { icon: ArrowRightLeft, color: "bg-orange-100 text-orange-600" },
  collaborator_added: { icon: UserPlus, color: "bg-indigo-100 text-indigo-600" },
  collaborator_removed: { icon: UserMinus, color: "bg-red-100 text-red-600" },
  system: { icon: Clock, color: "bg-gray-100 text-gray-600" },
};

export default function TeamFeedWidget() {
  const { data, isLoading } = useTeamFeed();
  const feed: TeamFeedItem[] = data?.feed || [];

  if (isLoading) {
    return (
      <Card className="app-card">
        <CardHeader>
          <CardTitle className="text-app-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Team Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="app-card">
      <CardHeader>
        <CardTitle className="text-app-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Team Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {feed.length === 0 ? (
          <div className="text-center py-6 text-app-muted">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No team activity yet</p>
            <p className="text-xs mt-1">Activity from cases you collaborate on will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feed.slice(0, 8).map((item) => {
              const config = feedTypeConfig[item.type] || feedTypeConfig.system;
              const Icon = config.icon;

              return (
                <Link
                  key={item.timeline_id}
                  href={`/dashboard/clients/${item.client_id}`}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-app-muted transition-colors group"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-app-foreground truncate">
                        {item.author_name || "System"}
                      </span>
                      <span className="text-xs text-app-muted">in</span>
                      <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 truncate max-w-[120px]">
                        {item.client_name}
                      </Badge>
                    </div>
                    {item.content && (
                      <p className="text-xs text-app-muted mt-0.5 line-clamp-1">
                        {item.content}
                      </p>
                    )}
                    <span className="text-xs text-app-muted">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
