"use client";

import { useState } from "react";
import {
  UserPlus,
  Users,
  MoreHorizontal,
  Trash2,
  Crown,
  Shield,
  Eye,
  UserCheck,
  Loader2,
  Mail,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCollaborators,
  useAddCollaborator,
  useUpdateCollaborator,
  useRemoveCollaborator,
} from "@/lib/hooks/use-collaboration";
import {
  ROLE_CONFIG,
  type CaseCollaborator,
  type CollaboratorRole,
} from "@/lib/types/collaboration";
import { toast } from "sonner";

const roleIcons: Record<CollaboratorRole, React.ElementType> = {
  owner: Crown,
  co_owner: Shield,
  supporting: UserCheck,
  reviewer: Eye,
  observer: Eye,
};

interface CollaboratorsPanelProps {
  clientId: string;
  currentUserId: string;
  isCaseOwner?: boolean;
}

export default function CollaboratorsPanel({ clientId, currentUserId, isCaseOwner }: CollaboratorsPanelProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("supporting");

  const { data, isLoading } = useCollaborators(clientId);
  const addCollaborator = useAddCollaborator(clientId);
  const updateCollaborator = useUpdateCollaborator(clientId);
  const removeCollaborator = useRemoveCollaborator(clientId);

  const collaborators: CaseCollaborator[] = data?.collaborators || [];
  const currentUserCollab = collaborators.find(c => c.broker_id === currentUserId);
  const isOwner = isCaseOwner || currentUserCollab?.role === "owner" || currentUserCollab?.role === "co_owner";

  const handleAdd = async () => {
    if (!email.trim()) return;
    try {
      await addCollaborator.mutateAsync({ email: email.trim(), role });
      toast.success("Collaborator invited successfully");
      setEmail("");
      setRole("supporting");
      setShowAddDialog(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add collaborator";
      toast.error(message);
    }
  };

  const handleRoleChange = async (collaboratorId: string, newRole: string) => {
    try {
      await updateCollaborator.mutateAsync({ collaboratorId, role: newRole });
      toast.success("Role updated");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update role";
      toast.error(message);
    }
  };

  const handleRemove = async (collaboratorId: string, name: string) => {
    if (!confirm(`Remove ${name} from this case?`)) return;
    try {
      await removeCollaborator.mutateAsync(collaboratorId);
      toast.success("Collaborator removed");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove collaborator";
      toast.error(message);
    }
  };

  const handleAcceptInvite = async (collaboratorId: string) => {
    try {
      await updateCollaborator.mutateAsync({ collaboratorId, status: "active" });
      toast.success("Invite accepted!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to accept invite";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <Card className="app-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-app-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Team Members ({collaborators.filter(c => c.status === "active").length})
          </h3>
          <p className="text-sm text-app-muted">Manage who has access to this case</p>
        </div>
        {isOwner && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Invite a broker to collaborate on this case by their email address.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Broker Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
                    <Input
                      id="email"
                      placeholder="broker@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as CollaboratorRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(ROLE_CONFIG) as [CollaboratorRole, typeof ROLE_CONFIG[CollaboratorRole]][])
                        .filter(([key]) => key !== "owner")
                        .map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{config.label}</span>
                              <span className="text-xs text-muted-foreground">- {config.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowAddDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={handleAdd}
                    disabled={!email.trim() || addCollaborator.isPending}
                  >
                    {addCollaborator.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    Invite
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pending Invite Banner (if current user has pending invite) */}
      {currentUserCollab?.status === "pending" && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">You have a pending invitation</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">Accept to start collaborating on this case</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => handleAcceptInvite(currentUserCollab.id)}
              >
                <Check className="w-4 h-4 mr-1" /> Accept
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collaborators List */}
      <div className="space-y-3">
        {collaborators.map((collab) => {
          const roleConfig = ROLE_CONFIG[collab.role];
          const RoleIcon = roleIcons[collab.role];
          const isMe = collab.broker_id === currentUserId;
          const isPending = collab.status === "pending";

          return (
            <Card key={collab.id} className={`app-card ${isPending ? "opacity-70" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {collab.broker?.avatar_url ? (
                        <img
                          src={collab.broker.avatar_url}
                          alt={collab.broker.full_name || ""}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-primary font-semibold text-sm">
                          {(collab.broker?.full_name || collab.broker?.email || "?")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-app-foreground">
                          {collab.broker?.full_name || collab.broker?.email || "Unknown"}
                          {isMe && (
                            <span className="text-xs text-app-muted ml-1">(you)</span>
                          )}
                        </p>
                        {isPending && (
                          <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-app-muted">{collab.broker?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Role Badge */}
                    <Badge variant="outline" className={`${roleConfig.color} border font-medium`}>
                      <RoleIcon className="w-3 h-3 mr-1" />
                      {roleConfig.label}
                    </Badge>

                    {/* Actions (only for owners on non-owner collaborators) */}
                    {isOwner && collab.role !== "owner" && !isMe && (
                      <div className="flex items-center gap-1">
                        {/* Role change dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(Object.entries(ROLE_CONFIG) as [CollaboratorRole, typeof ROLE_CONFIG[CollaboratorRole]][])
                              .filter(([key]) => key !== "owner" && key !== collab.role)
                              .map(([key, config]) => (
                                <DropdownMenuItem
                                  key={key}
                                  onClick={() => handleRoleChange(collab.id, key)}
                                >
                                  Change to {config.label}
                                </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {/* Explicit Remove button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() =>
                            handleRemove(
                              collab.id,
                              collab.broker?.full_name || collab.broker?.email || "this member"
                            )
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          <span className="text-xs">Remove</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {collaborators.length === 0 && (
          <Card className="app-card">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-app-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-app-foreground mb-2">No Team Members Yet</h3>
              <p className="text-app-muted">Add brokers to collaborate on this case.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
