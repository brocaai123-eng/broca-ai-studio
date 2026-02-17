"use client";

import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserPlus,
  Users,
  Loader2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePendingInvites, useCollaborationStats } from "@/lib/hooks/use-collaboration";
import { useAcceptInvite, useRejectInvite } from "@/lib/hooks/use-collaboration";
import type { CollaborationStats } from "@/lib/types/collaboration";
import { toast } from "sonner";

export default function PendingInvitesBanner() {
  const { data: invitesData, isLoading: invitesLoading } = usePendingInvites();
  const { data: statsData, isLoading: statsLoading } = useCollaborationStats();
  const acceptInvite = useAcceptInvite();
  const rejectInvite = useRejectInvite();

  const invites = invitesData?.invites || [];
  const stats: CollaborationStats | null = statsData?.stats || null;

  const handleAccept = async (clientId: string, collaboratorId: string) => {
    try {
      await acceptInvite.mutateAsync({ clientId, collaboratorId });
      toast.success("Invite accepted! You can now view this case.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to accept invite";
      toast.error(message);
    }
  };

  const handleReject = async (clientId: string, collaboratorId: string) => {
    try {
      await rejectInvite.mutateAsync({ clientId, collaboratorId });
      toast.success("Invite declined.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to decline invite";
      toast.error(message);
    }
  };

  if (invitesLoading || statsLoading) return null;

  const hasInvites = invites.length > 0;
  const hasStats = stats && (stats.milestones_due_today > 0 || stats.blocked_milestones > 0);

  if (!hasInvites && !hasStats) return null;

  return (
    <div className="space-y-4">
      {/* Pending Invites */}
      {hasInvites && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Pending Case Invitations ({invites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invites.map((invite: {
                id: string;
                client_id: string;
                client?: { id: string; name: string; email: string; status: string };
                invited_by_profile?: { full_name: string | null; email: string };
              }) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-app"
                >
                  <div>
                    <p className="font-medium text-app-foreground text-sm">
                      {invite.client?.name || "Unknown Client"}
                    </p>
                    <p className="text-xs text-app-muted">
                      Invited by {invite.invited_by_profile?.full_name || invite.invited_by_profile?.email || "Unknown"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleReject(invite.client_id, invite.id)}
                      disabled={rejectInvite.isPending}
                    >
                      {rejectInvite.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs bg-primary hover:bg-primary/90"
                      onClick={() => handleAccept(invite.client_id, invite.id)}
                      disabled={acceptInvite.isPending}
                    >
                      {acceptInvite.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      )}
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collaboration Alerts */}
      {hasStats && (
        <div className="flex flex-wrap gap-3">
          {stats.milestones_due_today > 0 && (
            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 px-3 py-1">
              <Clock className="w-3 h-3 mr-1" />
              {stats.milestones_due_today} milestone{stats.milestones_due_today > 1 ? "s" : ""} due today
            </Badge>
          )}
          {stats.blocked_milestones > 0 && (
            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 px-3 py-1">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {stats.blocked_milestones} blocked milestone{stats.blocked_milestones > 1 ? "s" : ""}
            </Badge>
          )}
          {stats.total_collaborations > 0 && (
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1">
              <Users className="w-3 h-3 mr-1" />
              {stats.total_collaborations} active collaboration{stats.total_collaborations > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
