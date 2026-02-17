"use client";

import Link from "next/link";
import {
  Handshake,
  Users,
  ArrowRight,
  Loader2,
  Crown,
  Shield,
  UserCheck,
  Eye,
  Clock,
  ExternalLink,
  Bell,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/supabase/auth-context";
import { usePendingInvites } from "@/lib/hooks/use-collaboration";
import { useQuery } from "@tanstack/react-query";
import type { CollaboratorRole } from "@/lib/types/collaboration";

const roleIcons: Record<CollaboratorRole, React.ElementType> = {
  owner: Crown,
  co_owner: Shield,
  supporting: UserCheck,
  reviewer: Eye,
  observer: Eye,
};

const roleColors: Record<CollaboratorRole, string> = {
  owner: "bg-purple-100 text-purple-700 border-purple-200",
  co_owner: "bg-blue-100 text-blue-700 border-blue-200",
  supporting: "bg-green-100 text-green-700 border-green-200",
  reviewer: "bg-yellow-100 text-yellow-700 border-yellow-200",
  observer: "bg-gray-100 text-gray-600 border-gray-200",
};

const roleLabels: Record<CollaboratorRole, string> = {
  owner: "Owner",
  co_owner: "Co-Owner",
  supporting: "Supporting",
  reviewer: "Reviewer",
  observer: "Observer",
};

function getInitials(name: string | null | undefined, email?: string): string {
  if (name) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

const avatarBgColors = [
  "bg-blue-200 text-blue-800",
  "bg-green-200 text-green-800",
  "bg-purple-200 text-purple-800",
  "bg-orange-200 text-orange-800",
  "bg-pink-200 text-pink-800",
  "bg-teal-200 text-teal-800",
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return avatarBgColors[Math.abs(hash) % avatarBgColors.length];
}

interface CollaboratorInfo {
  id: string;
  broker_id: string;
  role: CollaboratorRole;
  status: string;
  broker: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface OwnedCaseWithTeam {
  client_id: string;
  client_name: string;
  collaborators: CollaboratorInfo[];
}

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

export default function TeamSnapshotWidget() {
  const { data: casesData, isLoading: casesLoading } = useCollaborationCases();
  const { data: invitesData, isLoading: invitesLoading } = usePendingInvites();

  const isLoading = casesLoading || invitesLoading;
  const ownedWithCollaborators: OwnedCaseWithTeam[] = casesData?.ownedWithCollaborators || [];
  const invites = invitesData?.invites || [];
  const summary = casesData?.summary || {
    totalOwnedTeamMembers: 0,
    activeCollaborationsOnOthers: 0,
    ownedCasesWithTeams: 0,
    totalTeamCases: 0,
  };

  if (isLoading) {
    return (
      <Card className="app-card">
        <CardHeader>
          <CardTitle className="text-app-foreground flex items-center gap-2">
            <Handshake className="w-5 h-5 text-primary" />
            Team Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const hasTeam = summary.totalOwnedTeamMembers > 0 || summary.activeCollaborationsOnOthers > 0;
  const hasPendingInvites = invites.length > 0;
  const hasAnything = hasTeam || hasPendingInvites;

  return (
    <Card className="app-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-app-foreground flex items-center gap-2">
            <Handshake className="w-5 h-5 text-primary" />
            Team Snapshot
          </CardTitle>
          <Link href="/dashboard/collaboration">
            <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {!hasAnything ? (
          <div className="text-center py-6">
            <Users className="w-10 h-10 mx-auto mb-3 text-app-muted opacity-50" />
            <p className="text-sm text-app-muted">No active collaborations yet</p>
            <p className="text-xs text-app-muted mt-1">
              Invite brokers to collaborate on cases from the client detail page
            </p>
            <Link href="/dashboard/collaboration">
              <Button variant="outline" size="sm" className="mt-3 text-xs">
                <Handshake className="w-3.5 h-3.5 mr-1.5" />
                Go to Collaboration
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Stats Row */}
            <div className="flex items-center gap-4 text-sm">
              {summary.ownedCasesWithTeams > 0 && (
                <div className="flex items-center gap-1.5 text-app-muted">
                  <Crown className="w-4 h-4 text-purple-500" />
                  <span>
                    <span className="font-semibold text-app-foreground">{summary.ownedCasesWithTeams}</span>
                    {" "}case{summary.ownedCasesWithTeams !== 1 ? "s" : ""} with team
                  </span>
                </div>
              )}
              {summary.totalOwnedTeamMembers > 0 && (
                <div className="flex items-center gap-1.5 text-app-muted">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>
                    <span className="font-semibold text-app-foreground">{summary.totalOwnedTeamMembers}</span>
                    {" "}member{summary.totalOwnedTeamMembers !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {summary.activeCollaborationsOnOthers > 0 && (
                <div className="flex items-center gap-1.5 text-app-muted">
                  <Handshake className="w-4 h-4 text-green-500" />
                  <span>
                    <span className="font-semibold text-app-foreground">{summary.activeCollaborationsOnOthers}</span>
                    {" "}collab{summary.activeCollaborationsOnOthers !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {hasPendingInvites && (
                <div className="flex items-center gap-1.5 text-app-muted">
                  <Bell className="w-4 h-4 text-amber-500" />
                  <span>
                    <span className="font-semibold text-amber-600">{invites.length}</span>
                    {" "}pending
                  </span>
                </div>
              )}
            </div>

            {/* Owned Cases with Team Members */}
            {ownedWithCollaborators.length > 0 && (
              <div className="space-y-3">
                {ownedWithCollaborators.slice(0, 3).map((caseItem) => (
                  <div
                    key={caseItem.client_id}
                    className="p-3 rounded-lg border border-app bg-app-muted/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Crown className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-app-foreground truncate">
                          {caseItem.client_name}
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 flex-shrink-0">
                          Owner
                        </Badge>
                      </div>
                      <Link href={`/dashboard/clients/${caseItem.client_id}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-app-muted hover:text-primary">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                    {/* Collaborator Avatars Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {caseItem.collaborators.map((collab) => {
                        const RoleIcon = roleIcons[collab.role];
                        const name = collab.broker?.full_name || collab.broker?.email || "Unknown";
                        const initials = getInitials(collab.broker?.full_name, collab.broker?.email);
                        const colorClass = getAvatarColor(collab.broker_id);
                        const isPending = collab.status === "pending";

                        return (
                          <div
                            key={collab.id}
                            className="flex items-center gap-1.5 bg-white dark:bg-app-card rounded-full border border-app px-2 py-1"
                            title={`${name} - ${roleLabels[collab.role]}${isPending ? " (Pending)" : ""}`}
                          >
                            <Avatar className="w-5 h-5">
                              <AvatarFallback className={`text-[10px] font-medium ${colorClass}`}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-app-foreground max-w-[80px] truncate">
                              {collab.broker?.full_name?.split(" ")[0] || collab.broker?.email?.split("@")[0] || "?"}
                            </span>
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 leading-tight ${roleColors[collab.role]}`}>
                              <RoleIcon className="w-2.5 h-2.5 mr-0.5" />
                              {roleLabels[collab.role]}
                            </Badge>
                            {isPending && (
                              <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {ownedWithCollaborators.length > 3 && (
                  <Link href="/dashboard/collaboration" className="block text-center">
                    <span className="text-xs text-primary hover:underline">
                      +{ownedWithCollaborators.length - 3} more case{ownedWithCollaborators.length - 3 > 1 ? "s" : ""} with teams
                    </span>
                  </Link>
                )}
              </div>
            )}

            {/* Pending Invites Preview */}
            {hasPendingInvites && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-app-muted uppercase tracking-wider">
                  Pending Invites
                </p>
                {invites.slice(0, 2).map((invite: {
                  id: string;
                  client_id: string;
                  client?: { name: string };
                  invited_by_profile?: { full_name: string | null; email: string };
                }) => (
                  <Link
                    key={invite.id}
                    href="/dashboard/collaboration"
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-app-muted transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-app-foreground truncate">
                        {invite.client?.name || "Unknown Client"}
                      </p>
                      <p className="text-xs text-app-muted truncate">
                        from {invite.invited_by_profile?.full_name || invite.invited_by_profile?.email || "Unknown"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 flex-shrink-0">
                      Pending
                    </Badge>
                  </Link>
                ))}
                {invites.length > 2 && (
                  <Link href="/dashboard/collaboration" className="block text-center">
                    <span className="text-xs text-primary hover:underline">
                      +{invites.length - 2} more invite{invites.length - 2 > 1 ? "s" : ""}
                    </span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
