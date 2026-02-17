// TypeScript types for Case-Centric Collaboration

export type CollaboratorRole = 'owner' | 'co_owner' | 'supporting' | 'reviewer' | 'observer';
export type CollaboratorStatus = 'pending' | 'active' | 'removed';
export type MilestoneStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
export type MilestonePriority = 'low' | 'medium' | 'high' | 'urgent';
export type TimelineEntryType =
  | 'comment'
  | 'mention'
  | 'milestone_created'
  | 'milestone_completed'
  | 'document_uploaded'
  | 'document_verified'
  | 'status_change'
  | 'collaborator_added'
  | 'collaborator_removed'
  | 'system';

export interface CollaboratorPermissions {
  can_edit: boolean;
  can_message: boolean;
  can_upload: boolean;
  can_approve: boolean;
  can_delete: boolean;
}

export interface CaseCollaborator {
  id: string;
  client_id: string;
  broker_id: string;
  role: CollaboratorRole;
  permissions: CollaboratorPermissions;
  added_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  status: CollaboratorStatus;
  created_at: string;
  updated_at: string;
  // Joined
  broker?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  client?: {
    id: string;
    name: string;
  };
}

export interface CaseMilestone {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  status: MilestoneStatus;
  priority: MilestonePriority;
  due_date: string | null;
  sla_hours: number | null;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined
  owner?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export interface TimelineMention {
  user_id: string;
  display_name: string;
}

export interface CaseTimelineEntry {
  id: string;
  client_id: string;
  author_id: string | null;
  type: TimelineEntryType;
  content: string | null;
  mentions: TimelineMention[];
  milestone_id: string | null;
  metadata: Record<string, unknown>;
  is_internal: boolean;
  created_at: string;
  // Joined
  author?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  milestone?: {
    id: string;
    title: string;
  };
}

export interface TeamFeedItem {
  timeline_id: string;
  client_id: string;
  client_name: string;
  author_id: string | null;
  author_name: string | null;
  type: TimelineEntryType;
  content: string | null;
  mentions: TimelineMention[];
  milestone_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CollaborationStats {
  total_collaborations: number;
  pending_invites: number;
  milestones_due_today: number;
  blocked_milestones: number;
  unread_mentions: number;
}

// Role display config
export const ROLE_CONFIG: Record<CollaboratorRole, {
  label: string;
  description: string;
  color: string;
  defaultPermissions: CollaboratorPermissions;
}> = {
  owner: {
    label: 'Owner',
    description: 'Full control over the case',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    defaultPermissions: { can_edit: true, can_message: true, can_upload: true, can_approve: true, can_delete: true },
  },
  co_owner: {
    label: 'Co-Owner',
    description: 'Almost full access, cannot delete case',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    defaultPermissions: { can_edit: true, can_message: true, can_upload: true, can_approve: true, can_delete: false },
  },
  supporting: {
    label: 'Supporting',
    description: 'Work on tasks, upload docs, comment',
    color: 'bg-green-100 text-green-800 border-green-200',
    defaultPermissions: { can_edit: true, can_message: true, can_upload: true, can_approve: false, can_delete: false },
  },
  reviewer: {
    label: 'Reviewer',
    description: 'Approve decisions, cannot edit',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    defaultPermissions: { can_edit: false, can_message: true, can_upload: false, can_approve: true, can_delete: false },
  },
  observer: {
    label: 'Observer',
    description: 'View only, no actions',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    defaultPermissions: { can_edit: false, can_message: false, can_upload: false, can_approve: false, can_delete: false },
  },
};

export const MILESTONE_STATUS_CONFIG: Record<MilestoneStatus, {
  label: string;
  color: string;
}> = {
  not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700 border-red-200' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export const PRIORITY_CONFIG: Record<MilestonePriority, {
  label: string;
  color: string;
}> = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-600' },
};
