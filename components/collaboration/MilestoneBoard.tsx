"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Target,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  XCircle,
  Trash2,
  Loader2,
  CalendarIcon,
  Flag,
  User,
  Play,
  Ban,
  RotateCcw,
  Pencil,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trophy,
  Zap,
  ArrowRight,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  useCollaborators,
  useApproveMilestone,
} from "@/lib/hooks/use-collaboration";
import {
  MILESTONE_STATUS_CONFIG,
  PRIORITY_CONFIG,
  type CaseMilestone,
  type MilestoneStatus,
  type MilestonePriority,
  type CaseCollaborator,
} from "@/lib/types/collaboration";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";

const statusIcons: Record<MilestoneStatus, React.ElementType> = {
  not_started: Circle,
  in_progress: Clock,
  blocked: AlertTriangle,
  completed: CheckCircle2,
  cancelled: XCircle,
};

// Next logical status transitions with action labels and icons
const STATUS_TRANSITIONS: Record<MilestoneStatus, { status: MilestoneStatus; label: string; icon: React.ElementType; color: string }[]> = {
  not_started: [
    { status: "in_progress", label: "Start", icon: Play, color: "bg-blue-500 hover:bg-blue-600 text-white" },
    { status: "blocked", label: "Block", icon: Ban, color: "bg-red-100 hover:bg-red-200 text-red-700" },
    { status: "cancelled", label: "Cancel", icon: XCircle, color: "bg-gray-100 hover:bg-gray-200 text-gray-600" },
  ],
  in_progress: [
    { status: "completed", label: "Complete", icon: CheckCircle2, color: "bg-green-500 hover:bg-green-600 text-white" },
    { status: "blocked", label: "Block", icon: Ban, color: "bg-red-100 hover:bg-red-200 text-red-700" },
    { status: "not_started", label: "Revert", icon: RotateCcw, color: "bg-gray-100 hover:bg-gray-200 text-gray-600" },
  ],
  blocked: [
    { status: "in_progress", label: "Unblock", icon: Play, color: "bg-blue-500 hover:bg-blue-600 text-white" },
    { status: "cancelled", label: "Cancel", icon: XCircle, color: "bg-gray-100 hover:bg-gray-200 text-gray-600" },
  ],
  completed: [
    { status: "in_progress", label: "Reopen", icon: RotateCcw, color: "bg-blue-100 hover:bg-blue-200 text-blue-700" },
  ],
  cancelled: [
    { status: "not_started", label: "Restore", icon: RotateCcw, color: "bg-gray-500 hover:bg-gray-600 text-white" },
  ],
};

const PRIORITY_ICONS: Record<MilestonePriority, { icon: React.ElementType; pulseColor: string }> = {
  low: { icon: Flag, pulseColor: "" },
  medium: { icon: Flag, pulseColor: "" },
  high: { icon: Zap, pulseColor: "animate-pulse" },
  urgent: { icon: Zap, pulseColor: "animate-pulse" },
};

interface MilestoneBoardProps {
  clientId: string;
  currentUserId: string;
  isCaseOwner?: boolean;
}

export default function MilestoneBoard({ clientId, currentUserId, isCaseOwner }: MilestoneBoardProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<CaseMilestone | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<MilestonePriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [statusFilter, setStatusFilter] = useState<MilestoneStatus | "all">("all");
  const [approvalDialog, setApprovalDialog] = useState<{ milestoneId: string; milestoneTitle: string; action: 'reject' | 'request_changes' } | null>(null);
  const [approvalReason, setApprovalReason] = useState("");

  const { data: milestonesData, isLoading } = useMilestones(clientId);
  const { data: collaboratorsData } = useCollaborators(clientId);
  const createMilestone = useCreateMilestone(clientId);
  const updateMilestone = useUpdateMilestone(clientId);
  const deleteMilestone = useDeleteMilestone(clientId);
  const approveMilestone = useApproveMilestone(clientId);

  const milestones: CaseMilestone[] = milestonesData?.milestones || [];
  const collaborators: CaseCollaborator[] = collaboratorsData?.collaborators || [];
  const activeCollaborators = collaborators.filter(c => c.status === "active");

  // Check if current user has edit permissions
  const currentCollab = collaborators.find(c => c.broker_id === currentUserId);
  const canEdit = isCaseOwner || currentCollab?.permissions?.can_edit || currentCollab?.role === "owner";
  const canApprove = isCaseOwner || currentCollab?.permissions?.can_approve || currentCollab?.role === "owner" || currentCollab?.role === "co_owner" || currentCollab?.role === "reviewer";

  // Compute progress
  const progress = useMemo(() => {
    if (milestones.length === 0) return { percent: 0, completed: 0, total: 0 };
    const completed = milestones.filter(m => m.status === "completed").length;
    return { percent: Math.round((completed / milestones.length) * 100), completed, total: milestones.length };
  }, [milestones]);

  // Filtered milestones
  const filteredMilestones = useMemo(() => {
    if (statusFilter === "all") return milestones;
    return milestones.filter(m => m.status === statusFilter);
  }, [milestones, statusFilter]);

  // Group counts
  const grouped = useMemo(() => ({
    not_started: milestones.filter(m => m.status === "not_started").length,
    in_progress: milestones.filter(m => m.status === "in_progress").length,
    blocked: milestones.filter(m => m.status === "blocked").length,
    completed: milestones.filter(m => m.status === "completed").length,
    cancelled: milestones.filter(m => m.status === "cancelled").length,
  }), [milestones]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setOwnerId("");
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      await createMilestone.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate || undefined,
        owner_id: ownerId || undefined,
      });
      toast.success("Milestone created!");
      resetForm();
      setShowCreateDialog(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create milestone";
      toast.error(message);
    }
  };

  const handleStatusChange = async (milestoneId: string, newStatus: MilestoneStatus) => {
    try {
      await updateMilestone.mutateAsync({ milestoneId, status: newStatus });
      const config = MILESTONE_STATUS_CONFIG[newStatus];
      if (newStatus === "completed") {
        toast.success("Milestone completed! 🎉");
      } else {
        toast.success(`Status updated to ${config.label}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      toast.error(message);
    }
  };

  const handleEdit = async () => {
    if (!editingMilestone || !title.trim()) return;
    try {
      await updateMilestone.mutateAsync({
        milestoneId: editingMilestone.id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate || null,
        owner_id: ownerId || undefined,
      });
      toast.success("Milestone updated!");
      setEditingMilestone(null);
      resetForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update milestone";
      toast.error(message);
    }
  };

  const openEditDialog = (milestone: CaseMilestone) => {
    setTitle(milestone.title);
    setDescription(milestone.description || "");
    setPriority(milestone.priority);
    setDueDate(milestone.due_date ? milestone.due_date.split("T")[0] : "");
    setOwnerId(milestone.owner_id || "");
    setEditingMilestone(milestone);
  };

  const handleDelete = async (milestoneId: string, milestoneTitle: string) => {
    if (!confirm(`Delete milestone "${milestoneTitle}"?`)) return;
    try {
      await deleteMilestone.mutateAsync(milestoneId);
      toast.success("Milestone deleted");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete milestone";
      toast.error(message);
    }
  };

  // === Approval Handlers ===
  const handleApprove = async (milestoneId: string, milestoneTitle: string) => {
    try {
      await approveMilestone.mutateAsync({ milestoneId, action: 'approve' });
      toast.success(`Milestone "${milestoneTitle}" approved! 🎉`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to approve";
      toast.error(message);
    }
  };

  const handleRejectOrRequestChanges = async () => {
    if (!approvalDialog) return;
    try {
      await approveMilestone.mutateAsync({
        milestoneId: approvalDialog.milestoneId,
        action: approvalDialog.action,
        reason: approvalReason.trim() || undefined,
      });
      const actionLabel = approvalDialog.action === 'reject' ? 'rejected' : 'changes requested';
      toast.success(`Milestone "${approvalDialog.milestoneTitle}" ${actionLabel}`);
      setApprovalDialog(null);
      setApprovalReason("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process";
      toast.error(message);
    }
  };

  const getDueDateInfo = (dueDate: string, status: MilestoneStatus) => {
    const date = new Date(dueDate);
    const isDone = status === "completed" || status === "cancelled";
    if (isDone) return { label: format(date, "MMM d"), className: "text-gray-500", urgent: false };
    if (isPast(date) && !isToday(date)) return { label: `${formatDistanceToNow(date)} overdue`, className: "text-red-600 font-semibold", urgent: true };
    if (isToday(date)) return { label: "Due today", className: "text-amber-600 font-semibold", urgent: true };
    return { label: `Due ${format(date, "MMM d")}`, className: "text-gray-500", urgent: false };
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
    <TooltipProvider>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-app-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Milestones
              {milestones.length > 0 && (
                <Badge variant="outline" className="ml-1 text-xs font-normal">
                  {progress.completed}/{progress.total}
                </Badge>
              )}
            </h3>
            <p className="text-sm text-app-muted">Track key deliverables and deadlines</p>
          </div>
          {canEdit && (
            <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Milestone
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Milestone</DialogTitle>
                  <DialogDescription>Add a new milestone to track progress on this case.</DialogDescription>
                </DialogHeader>
                <MilestoneForm
                  title={title} setTitle={setTitle}
                  description={description} setDescription={setDescription}
                  priority={priority} setPriority={setPriority}
                  dueDate={dueDate} setDueDate={setDueDate}
                  ownerId={ownerId} setOwnerId={setOwnerId}
                  collaborators={activeCollaborators}
                  onSubmit={handleCreate}
                  onCancel={() => setShowCreateDialog(false)}
                  isPending={createMilestone.isPending}
                  submitLabel="Create"
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Progress Bar */}
        {milestones.length > 0 && (
          <Card className="app-card overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {progress.percent === 100 ? (
                    <Trophy className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-primary" />
                  )}
                  <span className="font-semibold text-app-foreground">
                    {progress.percent === 100 ? "All milestones complete!" : `${progress.percent}% complete`}
                  </span>
                </div>
                <span className="text-sm text-app-muted">
                  {progress.completed} of {progress.total} done
                </span>
              </div>
              <Progress
                value={progress.percent}
                className="h-3 bg-gray-100 dark:bg-gray-800"
              />
              {/* Status chips row */}
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  All ({milestones.length})
                </button>
                {(Object.entries(grouped) as [MilestoneStatus, number][]).map(([status, count]) => {
                  if (count === 0) return null;
                  const config = MILESTONE_STATUS_CONFIG[status];
                  const StatusIcon = statusIcons[status];
                  return (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                        statusFilter === status
                          ? `${config.color} shadow-sm ring-1 ring-offset-1`
                          : `${config.color} opacity-60 hover:opacity-100`
                      }`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {config.label} ({count})
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Milestone List */}
        <div className="space-y-3">
          {filteredMilestones.length === 0 && milestones.length > 0 ? (
            <Card className="app-card">
              <CardContent className="p-6 text-center">
                <p className="text-app-muted">No milestones match this filter.</p>
                <Button variant="link" className="mt-1" onClick={() => setStatusFilter("all")}>Show all</Button>
              </CardContent>
            </Card>
          ) : milestones.length === 0 ? (
            <Card className="app-card">
              <CardContent className="p-8 text-center">
                <Target className="w-12 h-12 text-app-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-app-foreground mb-2">No Milestones Yet</h3>
                <p className="text-app-muted mb-4">Create milestones to track key deliverables for this case.</p>
                {canEdit && (
                  <Button onClick={() => setShowCreateDialog(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Milestone
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredMilestones.map((milestone) => {
              const statusConfig = MILESTONE_STATUS_CONFIG[milestone.status];
              const priorityConfig = PRIORITY_CONFIG[milestone.priority];
              const StatusIcon = statusIcons[milestone.status];
              const PriorityIconInfo = PRIORITY_ICONS[milestone.priority];
              const PriorityIcon = PriorityIconInfo.icon;
              const isExpanded = expandedId === milestone.id;
              const isOverdue =
                milestone.due_date &&
                milestone.status !== "completed" &&
                milestone.status !== "cancelled" &&
                isPast(new Date(milestone.due_date)) &&
                !isToday(new Date(milestone.due_date));
              const isDueToday =
                milestone.due_date &&
                milestone.status !== "completed" &&
                milestone.status !== "cancelled" &&
                isToday(new Date(milestone.due_date));
              const transitions = STATUS_TRANSITIONS[milestone.status];

              // Primary action config for prominent button
              const primaryAction = milestone.status === "not_started"
                ? { status: "in_progress" as MilestoneStatus, label: "Start Working", icon: Play, className: "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900" }
                : milestone.status === "in_progress"
                ? { status: "completed" as MilestoneStatus, label: "Mark Complete", icon: CheckCircle2, className: "bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-200 dark:shadow-green-900" }
                : milestone.status === "blocked"
                ? { status: "in_progress" as MilestoneStatus, label: "Unblock & Resume", icon: Play, className: "bg-blue-500 hover:bg-blue-600 text-white shadow-sm" }
                : null;

              // Steps for visual stepper
              const steps = [
                { key: "not_started", label: "Not Started", icon: Circle },
                { key: "in_progress", label: "In Progress", icon: Clock },
                { key: "completed", label: "Completed", icon: CheckCircle2 },
              ];
              const currentStepIndex = steps.findIndex(s => s.key === milestone.status);

              return (
                <Card
                  key={milestone.id}
                  className={`app-card transition-all duration-200 ${
                    isOverdue ? "border-red-300 dark:border-red-800 shadow-red-100 dark:shadow-none" :
                    isDueToday ? "border-amber-300 dark:border-amber-800" :
                    milestone.status === "completed" ? "border-green-200 dark:border-green-900 opacity-80" :
                    milestone.status === "cancelled" ? "opacity-50" : ""
                  } ${isExpanded ? "ring-1 ring-primary/30" : "hover:shadow-md"}`}
                >
                  <CardContent className="p-0">
                    {/* Main row - always visible */}
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : milestone.id)}
                    >
                      {/* Status icon */}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${statusConfig.color}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-medium text-app-foreground ${milestone.status === "completed" ? "line-through opacity-60" : ""}`}>
                            {milestone.title}
                          </p>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityConfig.color} ${PriorityIconInfo.pulseColor}`}>
                            <PriorityIcon className="w-2.5 h-2.5 mr-0.5" />
                            {priorityConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          {milestone.due_date && (() => {
                            const info = getDueDateInfo(milestone.due_date, milestone.status);
                            return (
                              <span className={`flex items-center gap-1 ${info.className}`}>
                                <CalendarIcon className="w-3 h-3" />
                                {info.label}
                                {info.urgent && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                              </span>
                            );
                          })()}
                          {milestone.owner && (
                            <span className="flex items-center gap-1 text-app-muted">
                              <User className="w-3 h-3" />
                              {milestone.owner.full_name || milestone.owner.email}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Prominent primary action button */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {canEdit && primaryAction && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(milestone.id, primaryAction.status);
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${primaryAction.className}`}
                          >
                            {(() => { const Icon = primaryAction.icon; return <Icon className="w-4 h-4" />; })()}
                            {primaryAction.label}
                          </button>
                        )}
                        {milestone.status === "completed" && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-xs px-3 py-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Done
                          </Badge>
                        )}
                        {milestone.status === "cancelled" && (
                          <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 text-xs px-3 py-1.5">
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Cancelled
                          </Badge>
                        )}
                        {/* Expand chevron */}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-app-muted" onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : milestone.id); }}>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded section */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 dark:border-gray-800 px-4 pb-4 pt-3 space-y-4 bg-gray-50/50 dark:bg-gray-900/30">
                        {/* Description */}
                        {milestone.description && (
                          <p className="text-sm text-app-muted leading-relaxed">{milestone.description}</p>
                        )}

                        {/* Visual Progress Stepper */}
                        {milestone.status !== "cancelled" && (
                          <div className="py-2">
                            <p className="text-xs text-app-muted mb-3 font-medium">Progress</p>
                            <div className="flex items-center gap-0">
                              {steps.map((step, i) => {
                                const StepIcon = step.icon;
                                const isActive = step.key === milestone.status;
                                const isDone = milestone.status === "completed" || (currentStepIndex > i);
                                const isClickable = canEdit && !isDone && !isActive && (
                                  // Only allow clicking the next logical step
                                  (milestone.status === "not_started" && step.key === "in_progress") ||
                                  (milestone.status === "in_progress" && step.key === "completed")
                                );
                                return (
                                  <div key={step.key} className="flex items-center flex-1">
                                    <button
                                      disabled={!isClickable}
                                      onClick={() => isClickable && handleStatusChange(milestone.id, step.key as MilestoneStatus)}
                                      className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition-all ${
                                        isClickable ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" : ""
                                      }`}
                                    >
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                        isDone
                                          ? "bg-green-500 text-white"
                                          : isActive
                                          ? step.key === "in_progress" ? "bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-900" : "bg-primary text-white ring-4 ring-primary/20"
                                          : isClickable
                                          ? "bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900 dark:hover:text-blue-400"
                                          : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                      }`}>
                                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                                      </div>
                                      <span className={`text-[10px] font-medium ${
                                        isDone ? "text-green-600 dark:text-green-400" :
                                        isActive ? "text-app-foreground font-semibold" :
                                        isClickable ? "text-blue-600 dark:text-blue-400" :
                                        "text-gray-400"
                                      }`}>
                                        {isClickable ? `Click to ${step.key === "in_progress" ? "Start" : "Complete"}` : step.label}
                                      </span>
                                    </button>
                                    {i < steps.length - 1 && (
                                      <div className={`h-0.5 w-6 flex-shrink-0 -mx-1 ${
                                        isDone ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                                      }`} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Other status transitions (block, cancel, revert, etc.) */}
                        {canEdit && transitions.length > 0 && (
                          <div>
                            <p className="text-xs text-app-muted mb-2 font-medium">Other Actions</p>
                            <div className="flex flex-wrap gap-2">
                              {transitions.filter(t => {
                                // Hide the primary action from "other actions" since it's already prominent
                                if (milestone.status === "not_started" && t.status === "in_progress") return false;
                                if (milestone.status === "in_progress" && t.status === "completed") return false;
                                if (milestone.status === "blocked" && t.status === "in_progress") return false;
                                return true;
                              }).map((t) => {
                                const TIcon = t.icon;
                                return (
                                  <button
                                    key={t.status}
                                    onClick={() => handleStatusChange(milestone.id, t.status)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${t.color}`}
                                  >
                                    <TIcon className="w-3.5 h-3.5" />
                                    {t.label}
                                    <ArrowRight className="w-3 h-3 opacity-50" />
                                    <span className="opacity-70">{MILESTONE_STATUS_CONFIG[t.status].label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Details grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="space-y-1">
                            <p className="text-app-muted font-medium">Status</p>
                            <Badge className={`${statusConfig.color} text-xs`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-app-muted font-medium">Priority</p>
                            <Badge variant="outline" className={`${priorityConfig.color} text-xs`}>
                              <PriorityIcon className="w-3 h-3 mr-1" />
                              {priorityConfig.label}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-app-muted font-medium">Due Date</p>
                            <p className="text-app-foreground">
                              {milestone.due_date ? format(new Date(milestone.due_date), "MMM d, yyyy") : "No deadline"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-app-muted font-medium">Assigned To</p>
                            <p className="text-app-foreground">
                              {milestone.owner?.full_name || milestone.owner?.email || "Unassigned"}
                            </p>
                          </div>
                        </div>

                        {/* Timestamps */}
                        <div className="flex flex-wrap gap-4 text-xs text-app-muted">
                          <span>Created {formatDistanceToNow(new Date(milestone.created_at), { addSuffix: true })}</span>
                          {milestone.started_at && (
                            <span>Started {formatDistanceToNow(new Date(milestone.started_at), { addSuffix: true })}</span>
                          )}
                          {milestone.completed_at && (
                            <span>Completed {formatDistanceToNow(new Date(milestone.completed_at), { addSuffix: true })}</span>
                          )}
                        </div>

                        {/* Action buttons */}
                        {canEdit && (
                          <div className="flex gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => openEditDialog(milestone)}
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              Edit Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => handleDelete(milestone.id, milestone.title)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}

                        {/* Approval buttons - visible for users with can_approve permission */}
                        {canApprove && milestone.status !== "completed" && milestone.status !== "cancelled" && (
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                            <p className="text-xs text-app-muted mb-2 font-medium flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Review & Approve
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                className="text-xs bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApprove(milestone.id, milestone.title)}
                                disabled={approveMilestone.isPending}
                              >
                                {approveMilestone.isPending ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                                onClick={() => setApprovalDialog({
                                  milestoneId: milestone.id,
                                  milestoneTitle: milestone.title,
                                  action: 'request_changes',
                                })}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Request Changes
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() => setApprovalDialog({
                                  milestoneId: milestone.id,
                                  milestoneTitle: milestone.title,
                                  action: 'reject',
                                })}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Approval Dialog for Reject / Request Changes */}
        <Dialog open={!!approvalDialog} onOpenChange={(open) => { if (!open) { setApprovalDialog(null); setApprovalReason(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {approvalDialog?.action === 'reject' ? 'Reject Milestone' : 'Request Changes'}
              </DialogTitle>
              <DialogDescription>
                {approvalDialog?.action === 'reject'
                  ? `Rejecting "${approvalDialog?.milestoneTitle}". This will mark it as blocked.`
                  : `Requesting changes on "${approvalDialog?.milestoneTitle}". This will move it back to in progress.`}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Reason (optional) — explain what needs to be changed"
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setApprovalDialog(null); setApprovalReason(""); }}
              >
                Cancel
              </Button>
              <Button
                variant={approvalDialog?.action === 'reject' ? "destructive" : "default"}
                onClick={handleRejectOrRequestChanges}
                disabled={approveMilestone.isPending}
              >
                {approveMilestone.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {approvalDialog?.action === 'reject' ? 'Reject' : 'Request Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingMilestone} onOpenChange={(open) => { if (!open) { setEditingMilestone(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Milestone</DialogTitle>
              <DialogDescription>Update milestone details.</DialogDescription>
            </DialogHeader>
            <MilestoneForm
              title={title} setTitle={setTitle}
              description={description} setDescription={setDescription}
              priority={priority} setPriority={setPriority}
              dueDate={dueDate} setDueDate={setDueDate}
              ownerId={ownerId} setOwnerId={setOwnerId}
              collaborators={activeCollaborators}
              onSubmit={handleEdit}
              onCancel={() => { setEditingMilestone(null); resetForm(); }}
              isPending={updateMilestone.isPending}
              submitLabel="Save Changes"
            />
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// Reusable form for create / edit
function MilestoneForm({
  title, setTitle,
  description, setDescription,
  priority, setPriority,
  dueDate, setDueDate,
  ownerId, setOwnerId,
  collaborators,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  priority: MilestonePriority; setPriority: (v: MilestonePriority) => void;
  dueDate: string; setDueDate: (v: string) => void;
  ownerId: string; setOwnerId: (v: string) => void;
  collaborators: CaseCollaborator[];
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="ms-title">Title</Label>
        <Input
          id="ms-title"
          placeholder="e.g., Document collection complete"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ms-desc">Description (optional)</Label>
        <Textarea
          id="ms-desc"
          placeholder="Add details about this milestone..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as MilestonePriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(PRIORITY_CONFIG) as [MilestonePriority, typeof PRIORITY_CONFIG[MilestonePriority]][]).map(
                ([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ms-due">Due Date</Label>
          <Input
            id="ms-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>
      {collaborators.length > 0 && (
        <div className="space-y-2">
          <Label>Assign To</Label>
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger>
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {collaborators.map((c) => (
                <SelectItem key={c.broker_id} value={c.broker_id}>
                  {c.broker?.full_name || c.broker?.email || "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={onSubmit}
          disabled={!title.trim() || isPending}
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
