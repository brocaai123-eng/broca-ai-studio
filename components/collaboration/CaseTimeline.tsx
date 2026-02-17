"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  UserPlus,
  UserMinus,
  Target,
  CheckCircle2,
  FileText,
  Shield,
  ArrowRightLeft,
  AtSign,
  Clock,
  Send,
  Loader2,
  Upload,
  Paperclip,
  X,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useTimeline,
  useAddComment,
  useCollaborators,
  useUploadDocument,
  useApproveMilestone,
} from "@/lib/hooks/use-collaboration";
import type {
  CaseTimelineEntry,
  TimelineEntryType,
  CaseCollaborator,
} from "@/lib/types/collaboration";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const typeConfig: Record<TimelineEntryType, {
  icon: React.ElementType;
  color: string;
  label: string;
}> = {
  comment: { icon: MessageSquare, color: "bg-blue-100 text-blue-600", label: "Comment" },
  mention: { icon: AtSign, color: "bg-purple-100 text-purple-600", label: "Mention" },
  milestone_created: { icon: Target, color: "bg-green-100 text-green-600", label: "Milestone" },
  milestone_completed: { icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600", label: "Completed" },
  document_uploaded: { icon: FileText, color: "bg-blue-100 text-blue-600", label: "Document" },
  document_verified: { icon: Shield, color: "bg-green-100 text-green-600", label: "Verified" },
  status_change: { icon: ArrowRightLeft, color: "bg-orange-100 text-orange-600", label: "Status" },
  collaborator_added: { icon: UserPlus, color: "bg-indigo-100 text-indigo-600", label: "Added" },
  collaborator_removed: { icon: UserMinus, color: "bg-red-100 text-red-600", label: "Removed" },
  system: { icon: Clock, color: "bg-gray-100 text-gray-600", label: "System" },
};

// Human-readable file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface CaseTimelineProps {
  clientId: string;
  currentUserId: string;
}

export default function CaseTimeline({ clientId, currentUserId }: CaseTimelineProps) {
  const [comment, setComment] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState("");
  const [approvalDialog, setApprovalDialog] = useState<{ milestoneId: string; milestoneTitle: string; action: 'reject' | 'request_changes' } | null>(null);
  const [approvalReason, setApprovalReason] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: timelineData, isLoading } = useTimeline(clientId);
  const { data: collaboratorsData } = useCollaborators(clientId);
  const addComment = useAddComment(clientId);
  const uploadDocument = useUploadDocument(clientId);
  const approveMilestone = useApproveMilestone(clientId);

  const entries: CaseTimelineEntry[] = timelineData?.entries || [];
  const collaborators: CaseCollaborator[] = collaboratorsData?.collaborators || [];
  const activeCollaborators = collaborators.filter(c => c.status === "active" && c.broker_id !== currentUserId);

  // Check permissions
  const currentCollab = collaborators.find(c => c.broker_id === currentUserId);
  const canComment = currentCollab?.permissions?.can_message || currentCollab?.role === "owner";
  const canUpload = currentCollab?.permissions?.can_upload || currentCollab?.role === "owner" || currentCollab?.role === "co_owner";
  const canApprove = currentCollab?.permissions?.can_approve || currentCollab?.role === "owner" || currentCollab?.role === "co_owner" || currentCollab?.role === "reviewer";

  // === Comment Handling ===
  const handleSubmit = async () => {
    if (!comment.trim()) return;

    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: { user_id: string; display_name: string }[] = [];
    let match;
    while ((match = mentionRegex.exec(comment)) !== null) {
      mentions.push({ display_name: match[1], user_id: match[2] });
    }

    const content = comment.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1");

    try {
      await addComment.mutateAsync({ content, mentions });
      setComment("");
    } catch (err: unknown) {
      // error handled by hook
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    setComment(val);
    setCursorPosition(pos);

    const textBefore = val.substring(0, pos);
    const atIndex = textBefore.lastIndexOf("@");
    if (atIndex >= 0 && !textBefore.substring(atIndex).includes(" ")) {
      const filter = textBefore.substring(atIndex + 1);
      setMentionFilter(filter.toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (collaborator: CaseCollaborator) => {
    const name = collaborator.broker?.full_name || collaborator.broker?.email || "Unknown";
    const textBefore = comment.substring(0, cursorPosition);
    const atIndex = textBefore.lastIndexOf("@");
    const textAfter = comment.substring(cursorPosition);

    const newComment =
      comment.substring(0, atIndex) +
      `@[${name}](${collaborator.broker_id}) ` +
      textAfter;

    setComment(newComment);
    setShowMentions(false);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const filteredMentionUsers = activeCollaborators.filter((c) => {
    const name = (c.broker?.full_name || c.broker?.email || "").toLowerCase();
    return name.includes(mentionFilter);
  });

  // === Document Upload Handling ===
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be under 10MB");
        return;
      }
      setSelectedFile(file);
      setShowUpload(true);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    try {
      await uploadDocument.mutateAsync({
        file: selectedFile,
        description: fileDescription.trim() || undefined,
      });
      toast.success(`"${selectedFile.name}" uploaded successfully`);
      setSelectedFile(null);
      setFileDescription("");
      setShowUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload";
      toast.error(message);
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setFileDescription("");
    setShowUpload(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // === Approval Handling ===
  const handleApprove = async (milestoneId: string, milestoneTitle: string) => {
    try {
      await approveMilestone.mutateAsync({ milestoneId, action: 'approve' });
      toast.success(`Milestone "${milestoneTitle}" approved!`);
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

  // Render comment text with highlighted @mentions
  const renderContent = (content: string | null) => {
    if (!content) return null;
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="text-primary font-medium">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
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
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-app-foreground flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Case Timeline ({entries.length})
        </h3>
        <p className="text-sm text-app-muted">Activity feed and team communication</p>
      </div>

      {/* Comment Input + Upload */}
      {(canComment || canUpload) && (
        <Card className="app-card">
          <CardContent className="p-4 space-y-3">
            {/* Comment */}
            {canComment && (
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  placeholder="Add a comment... (use @name to mention, Shift+Enter for new line)"
                  value={comment}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  className="resize-none pr-24"
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                  {/* Upload button */}
                  {canUpload && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                        onChange={handleFileSelect}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-app-muted hover:text-primary"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload document"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {/* Send button */}
                  <Button
                    size="icon"
                    className="h-8 w-8 bg-primary hover:bg-primary/90"
                    onClick={handleSubmit}
                    disabled={!comment.trim() || addComment.isPending}
                  >
                    {addComment.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* @mention dropdown */}
                {showMentions && filteredMentionUsers.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 w-64 bg-white dark:bg-gray-900 border border-app rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                    {filteredMentionUsers.map((c) => (
                      <button
                        key={c.broker_id}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-app-muted flex items-center gap-2 transition-colors"
                        onClick={() => insertMention(c)}
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {(c.broker?.full_name || c.broker?.email || "?")[0].toUpperCase()}
                        </div>
                        <span className="text-app-foreground">
                          {c.broker?.full_name || c.broker?.email}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Upload-only button (when user can upload but not comment) */}
            {!canComment && canUpload && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            )}

            {/* File pending upload preview */}
            {showUpload && selectedFile && (
              <div className="border border-app rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-app-foreground truncate">{selectedFile.name}</p>
                      <p className="text-xs text-app-muted">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-app-muted hover:text-red-500"
                    onClick={cancelUpload}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Add a description (optional)"
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={handleUploadSubmit}
                  disabled={uploadDocument.isPending}
                >
                  {uploadDocument.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline Entries */}
      <div className="relative">
        {/* Vertical line */}
        {entries.length > 0 && (
          <div className="absolute left-5 top-0 bottom-0 w-px bg-app-muted" />
        )}

        <div className="space-y-4">
          {entries.length === 0 ? (
            <Card className="app-card">
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-app-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-app-foreground mb-2">No Activity Yet</h3>
                <p className="text-app-muted">Be the first to add a comment or the timeline will populate as activity happens.</p>
              </CardContent>
            </Card>
          ) : (
            entries.map((entry) => {
              const config = typeConfig[entry.type] || typeConfig.system;
              const Icon = config.icon;
              const isComment = entry.type === "comment" || entry.type === "mention";
              const isDocument = entry.type === "document_uploaded";
              const isMilestoneAction = entry.type === "milestone_created" || entry.type === "milestone_completed" || entry.type === "status_change";
              const hasMilestone = !!entry.milestone;

              return (
                <div key={entry.id} className="relative flex gap-3 pl-1">
                  {/* Icon */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${config.color}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-4">
                    {isComment ? (
                      <Card className="app-card">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-app-foreground">
                              {entry.author?.full_name || entry.author?.email || "System"}
                            </span>
                            <span className="text-xs text-app-muted">
                              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-app-foreground whitespace-pre-wrap">
                            {renderContent(entry.content)}
                          </p>
                        </CardContent>
                      </Card>
                    ) : isDocument ? (
                      /* Document uploaded entry with file preview */
                      <Card className="app-card border-blue-200 dark:border-blue-800">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-app-foreground">
                              {entry.author?.full_name || entry.author?.email || "System"}
                            </span>
                            <span className="text-xs text-app-muted">
                              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                            <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-app-foreground truncate">
                                {(entry.metadata as any)?.file_name || "Document"}
                              </p>
                              {(entry.metadata as any)?.file_size && (
                                <p className="text-xs text-app-muted">
                                  {formatFileSize((entry.metadata as any).file_size)}
                                </p>
                              )}
                              {(entry.metadata as any)?.description && (
                                <p className="text-xs text-app-muted mt-1">
                                  {(entry.metadata as any).description}
                                </p>
                              )}
                            </div>
                            {(entry.metadata as any)?.file_url && (
                              <div className="flex gap-1 flex-shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-blue-600 hover:text-blue-700"
                                  onClick={() => window.open((entry.metadata as any).file_url, '_blank')}
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-blue-600 hover:text-blue-700"
                                  asChild
                                  title="Download"
                                >
                                  <a href={(entry.metadata as any).file_url} download={(entry.metadata as any).file_name}>
                                    <Download className="w-4 h-4" />
                                  </a>
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      /* System / milestone / status entries */
                      <div className="pt-1">
                        <p className="text-sm text-app-foreground">
                          <span className="font-medium">
                            {entry.author?.full_name || entry.author?.email || "System"}
                          </span>{" "}
                          <span className="text-app-muted">{entry.content}</span>
                        </p>
                        {entry.milestone && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-200">
                              <Target className="w-3 h-3 mr-1" />
                              {entry.milestone.title}
                            </Badge>

                            {/* Approval actions for milestone entries */}
                            {canApprove && isMilestoneAction && entry.type !== "milestone_completed" && (
                              <div className="flex items-center gap-1 ml-auto">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs text-green-700 hover:text-green-800 hover:bg-green-50"
                                  onClick={() => handleApprove(entry.milestone!.id, entry.milestone!.title)}
                                  disabled={approveMilestone.isPending}
                                  title="Approve milestone"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-xs text-app-muted hover:text-app-foreground"
                                    >
                                      <ChevronDown className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => setApprovalDialog({
                                        milestoneId: entry.milestone!.id,
                                        milestoneTitle: entry.milestone!.title,
                                        action: 'reject',
                                      })}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Reject
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-orange-600"
                                      onClick={() => setApprovalDialog({
                                        milestoneId: entry.milestone!.id,
                                        milestoneTitle: entry.milestone!.title,
                                        action: 'request_changes',
                                      })}
                                    >
                                      <RotateCcw className="w-4 h-4 mr-2" />
                                      Request Changes
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                        )}
                        <span className="text-xs text-app-muted block mt-1">
                          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Reject / Request Changes Dialog */}
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
            placeholder="Reason (optional)"
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
              {approveMilestone.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : approvalDialog?.action === 'reject' ? (
                <XCircle className="w-4 h-4 mr-2" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              {approvalDialog?.action === 'reject' ? 'Reject' : 'Request Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
