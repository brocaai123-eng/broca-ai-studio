"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Handshake,
  Activity,
  UserPlus,
  Users,
  Target,
  Shield,
  Crown,
  Eye,
  UserCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ExternalLink,
  Briefcase,
  MessageSquare,
  AtSign,
  FileText,
  ArrowRightLeft,
  UserMinus,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/supabase/auth-context";
import {
  useTeamFeed,
  usePendingInvites,
  useCollaborationStats,
  useAcceptInvite,
  useRejectInvite,
} from "@/lib/hooks/use-collaboration";
import { useQuery } from "@tanstack/react-query";
import type {
  TeamFeedItem,
  TimelineEntryType,
  CollaborationStats,
  CollaboratorRole,
} from "@/lib/types/collaboration";
import { ROLE_CONFIG } from "@/lib/types/collaboration";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

// Feed type icons
const feedTypeConfig: Record<TimelineEntryType, { icon: React.ElementType; color: string }> = {
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

const roleIcons: Record<CollaboratorRole, React.ElementType> = {
  owner: Crown,
  co_owner: Shield,
  supporting: UserCheck,
  reviewer: Eye,
  observer: Eye,
};

function useCollaborationCases() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["collaboration-cases"],
    queryFn: async () => {
      const res = await fetch("/api/clients/collaboration/cases");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });
}

export default function CollaborationPage() {
  const { user } = useAuth();
  const { data: feedData, isLoading: feedLoading } = useTeamFeed();
  const { data: invitesData, isLoading: invitesLoading } = usePendingInvites();
  const { data: statsData, isLoading: statsLoading } = useCollaborationStats();
  const { data: casesData, isLoading: casesLoading } = useCollaborationCases();
  const acceptInvite = useAcceptInvite();
  const rejectInvite = useRejectInvite();

  const feed: TeamFeedItem[] = feedData?.feed || [];
  const invites = invitesData?.invites || [];
  const stats: CollaborationStats | null = statsData?.stats || null;
  const collaborations = casesData?.collaborations || [];
  const ownedWithCollaborators: {
    client_id: string;
    client_name: string;
    client_email: string;
    client_status: string;
    collaborators: {
      id: string;
      broker_id: string;
      role: CollaboratorRole;
      status: string;
      permissions: Record<string, boolean>;
      invited_at: string;
      accepted_at: string | null;
      broker: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
    }[];
  }[] = casesData?.ownedWithCollaborators || [];

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

  const activeCollaborations = collaborations.filter(
    (c: { status: string; client?: { broker_id: string } }) =>
      c.status === "active" && c.client?.broker_id !== user?.id
  );

  return (
    <DashboardLayout title="Team & Collaboration" subtitle="Manage your collaborative cases, invites, and team activity">
      {/* Stats Overview */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="app-card">
            <CardContent className="p-4 text-center">
              <Crown className="w-5 h-5 mx-auto mb-1 text-purple-500" />
              <p className="text-2xl font-bold text-app-foreground">{ownedWithCollaborators.length}</p>
              <p className="text-xs text-app-muted">My Cases w/ Team</p>
            </CardContent>
          </Card>
          <Card className="app-card">
            <CardContent className="p-4 text-center">
              <Users className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold text-app-foreground">{stats.total_collaborations}</p>
              <p className="text-xs text-app-muted">Active Collaborations</p>
            </CardContent>
          </Card>
          <Card className="app-card">
            <CardContent className="p-4 text-center">
              <UserPlus className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold text-app-foreground">{stats.pending_invites}</p>
              <p className="text-xs text-app-muted">Pending Invites</p>
            </CardContent>
          </Card>
          <Card className="app-card">
            <CardContent className="p-4 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-bold text-app-foreground">{stats.milestones_due_today}</p>
              <p className="text-xs text-app-muted">Due Today</p>
            </CardContent>
          </Card>
          <Card className="app-card">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold text-app-foreground">{stats.blocked_milestones}</p>
              <p className="text-xs text-app-muted">Blocked</p>
            </CardContent>
          </Card>
          <Card className="app-card">
            <CardContent className="p-4 text-center">
              <AtSign className="w-5 h-5 mx-auto mb-1 text-purple-500" />
              <p className="text-2xl font-bold text-app-foreground">{stats.unread_mentions}</p>
              <p className="text-xs text-app-muted">Mentions (7d)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="cases" className="space-y-6">
        <TabsList className="bg-app-card border border-app p-1">
          <TabsTrigger value="cases" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Briefcase className="w-4 h-4 mr-2" />
            My Collaborations
          </TabsTrigger>
          <TabsTrigger value="invites" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <UserPlus className="w-4 h-4 mr-2" />
            Invites
            {invites.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0">
                {invites.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Activity className="w-4 h-4 mr-2" />
            Activity Feed
          </TabsTrigger>
        </TabsList>

        {/* Activity Feed Tab */}
        <TabsContent value="activity" className="space-y-4">
          {feedLoading ? (
            <Card className="app-card">
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : feed.length === 0 ? (
            <Card className="app-card">
              <CardContent className="p-8 text-center">
                <Activity className="w-12 h-12 text-app-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-app-foreground mb-2">No Activity Yet</h3>
                <p className="text-app-muted">
                  Activity from your cases and collaborations will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="app-card">
              <CardHeader>
                <CardTitle className="text-app-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Updates from all your cases and collaborations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {feed.map((item) => {
                    const config = feedTypeConfig[item.type] || feedTypeConfig.system;
                    const Icon = config.icon;
                    return (
                      <Link
                        key={item.timeline_id}
                        href={`/dashboard/clients/${item.client_id}`}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-app-muted transition-colors group"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-app-foreground">
                              {item.author_name || "System"}
                            </span>
                            <span className="text-xs text-app-muted">in</span>
                            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 truncate max-w-[160px]">
                              {item.client_name}
                            </Badge>
                          </div>
                          {item.content && (
                            <p className="text-sm text-app-muted mt-0.5">{item.content}</p>
                          )}
                          <span className="text-xs text-app-muted">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-app-muted opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Invites Tab */}
        <TabsContent value="invites" className="space-y-4">
          {invitesLoading ? (
            <Card className="app-card">
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : invites.length === 0 ? (
            <Card className="app-card">
              <CardContent className="p-8 text-center">
                <UserPlus className="w-12 h-12 text-app-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-app-foreground mb-2">No Pending Invites</h3>
                <p className="text-app-muted">
                  When other brokers invite you to collaborate on a case, you'll see it here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {invites.map((invite: {
                id: string;
                client_id: string;
                role: CollaboratorRole;
                invited_at: string;
                client?: { id: string; name: string; email: string; status: string };
                invited_by_profile?: { full_name: string | null; email: string };
              }) => {
                const roleConfig = ROLE_CONFIG[invite.role];
                const RoleIcon = roleIcons[invite.role];
                return (
                  <Card key={invite.id} className="app-card border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Handshake className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-app-foreground">
                              {invite.client?.name || "Unknown Client"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-app-muted">
                                Invited by {invite.invited_by_profile?.full_name || invite.invited_by_profile?.email || "Unknown"}
                              </p>
                              <span className="text-xs text-app-muted">·</span>
                              <p className="text-xs text-app-muted">
                                {formatDistanceToNow(new Date(invite.invited_at), { addSuffix: true })}
                              </p>
                            </div>
                            <Badge variant="outline" className={`mt-1 text-xs ${roleConfig.color}`}>
                              <RoleIcon className="w-3 h-3 mr-1" />
                              {roleConfig.label}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleReject(invite.client_id, invite.id)}
                            disabled={rejectInvite.isPending}
                          >
                            {rejectInvite.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-1" />
                            )}
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90"
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* My Collaborations Tab */}
        <TabsContent value="cases" className="space-y-6">
          {casesLoading ? (
            <Card className="app-card">
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : activeCollaborations.length === 0 && ownedWithCollaborators.length === 0 ? (
            <Card className="app-card">
              <CardContent className="p-8 text-center">
                <Handshake className="w-12 h-12 text-app-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-app-foreground mb-2">No Active Collaborations</h3>
                <p className="text-app-muted mb-4">
                  You're not currently collaborating on any cases. When you get invited to collaborate or add collaborators to your cases, they'll appear here.
                </p>
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link href="/dashboard/clients">
                    Go to Clients
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Cases I'm collaborating on */}
              {activeCollaborations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-app-muted uppercase tracking-wide mb-3">
                    Cases I'm Collaborating On
                  </h3>
                  <div className="space-y-3">
                    {activeCollaborations.map((collab: {
                      id: string;
                      client_id: string;
                      role: CollaboratorRole;
                      permissions: Record<string, boolean>;
                      accepted_at: string | null;
                      client?: { id: string; name: string; email: string; status: string };
                      invited_by_profile?: { full_name: string | null; email: string };
                    }) => {
                      const roleConfig = ROLE_CONFIG[collab.role];
                      const RoleIcon = roleIcons[collab.role];
                      const permissions = collab.permissions || {};
                      return (
                        <Card key={collab.id} className="app-card hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${roleConfig.color}`}>
                                  <RoleIcon className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-app-foreground">
                                    {collab.client?.name || "Unknown Client"}
                                  </p>
                                  <p className="text-xs text-app-muted">
                                    From {collab.invited_by_profile?.full_name || collab.invited_by_profile?.email || "Unknown"}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    <Badge variant="outline" className={`text-xs ${roleConfig.color}`}>
                                      <RoleIcon className="w-3 h-3 mr-0.5" />
                                      {roleConfig.label}
                                    </Badge>
                                    {/* Permission badges */}
                                    {permissions.can_edit && (
                                      <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200">Edit</Badge>
                                    )}
                                    {permissions.can_message && (
                                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">Message</Badge>
                                    )}
                                    {permissions.can_upload && (
                                      <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200">Upload</Badge>
                                    )}
                                    {permissions.can_approve && (
                                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">Approve</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/dashboard/clients/${collab.client_id}`}>
                                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                  Open Case
                                </Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* My cases with collaborators */}
              {ownedWithCollaborators.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-app-muted uppercase tracking-wide mb-3">
                    My Cases with Team Members
                  </h3>
                  <div className="space-y-3">
                    {ownedWithCollaborators.map((caseItem) => {
                      return (
                        <Card key={caseItem.client_id} className="app-card hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4 mb-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                  <Crown className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-app-foreground">
                                    {caseItem.client_name}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                                      <Crown className="w-3 h-3 mr-0.5" />
                                      Owner
                                    </Badge>
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                                      <Users className="w-3 h-3 mr-0.5" />
                                      {caseItem.collaborators.length} collaborator{caseItem.collaborators.length > 1 ? "s" : ""}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/dashboard/clients/${caseItem.client_id}`}>
                                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                  Manage
                                </Link>
                              </Button>
                            </div>
                            {/* Collaborators list */}
                            <div className="ml-13 pl-3 border-l-2 border-app space-y-2">
                              {caseItem.collaborators.map((collab) => {
                                const roleConfig = ROLE_CONFIG[collab.role];
                                const RoleIcon = roleIcons[collab.role];
                                const isPending = collab.status === "pending";
                                const name = collab.broker?.full_name || collab.broker?.email || "Unknown";
                                return (
                                  <div key={collab.id} className="flex items-center gap-3 py-1.5">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${roleConfig.color}`}>
                                      <RoleIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-app-foreground truncate">
                                        {name}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <Badge variant="outline" className={`text-[10px] ${roleConfig.color}`}>
                                        {roleConfig.label}
                                      </Badge>
                                      {isPending && (
                                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">
                                          <Clock className="w-2.5 h-2.5 mr-0.5" />
                                          Pending
                                        </Badge>
                                      )}
                                      {!isPending && collab.permissions?.can_edit && (
                                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200">Edit</Badge>
                                      )}
                                      {!isPending && collab.permissions?.can_message && (
                                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">Message</Badge>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
