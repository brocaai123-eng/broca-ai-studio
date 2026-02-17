import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/supabase/auth-context';

// ============================================================
// COLLABORATORS
// ============================================================

export function useCollaborators(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['collaborators', clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/collaborators`);
      if (!res.ok) throw new Error('Failed to fetch collaborators');
      return res.json();
    },
    enabled: !!clientId && !!user,
  });
}

export function useAddCollaborator(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const res = await fetch(`/api/clients/${clientId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add collaborator');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', clientId] });
      queryClient.invalidateQueries({ queryKey: ['timeline', clientId] });
    },
  });
}

export function useUpdateCollaborator(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { collaboratorId: string; role?: string; status?: string }) => {
      const res = await fetch(`/api/clients/${clientId}/collaborators`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update collaborator');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', clientId] });
      queryClient.invalidateQueries({ queryKey: ['timeline', clientId] });
    },
  });
}

export function useRemoveCollaborator(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (collaboratorId: string) => {
      const res = await fetch(`/api/clients/${clientId}/collaborators?id=${collaboratorId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to remove collaborator');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', clientId] });
      queryClient.invalidateQueries({ queryKey: ['timeline', clientId] });
    },
  });
}

// Accept a pending invite
export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { clientId: string; collaboratorId: string }) => {
      const res = await fetch(`/api/clients/${data.clientId}/collaborators`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratorId: data.collaboratorId, status: 'active' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to accept invite');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['collaboration-stats'] });
      queryClient.invalidateQueries({ queryKey: ['client-details', variables.clientId] });
    },
  });
}

// Reject/decline a pending invite
export function useRejectInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { clientId: string; collaboratorId: string }) => {
      const res = await fetch(`/api/clients/${data.clientId}/collaborators`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratorId: data.collaboratorId, status: 'removed' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reject invite');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['collaboration-stats'] });
    },
  });
}

// ============================================================
// MILESTONES
// ============================================================

export function useMilestones(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['milestones', clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/milestones`);
      if (!res.ok) throw new Error('Failed to fetch milestones');
      return res.json();
    },
    enabled: !!clientId && !!user,
  });
}

export function useCreateMilestone(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      owner_id?: string;
      priority?: string;
      due_date?: string;
    }) => {
      const res = await fetch(`/api/clients/${clientId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create milestone');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', clientId] });
      queryClient.invalidateQueries({ queryKey: ['timeline', clientId] });
    },
  });
}

export function useUpdateMilestone(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      milestoneId: string;
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      owner_id?: string;
      due_date?: string | null;
    }) => {
      const res = await fetch(`/api/clients/${clientId}/milestones`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update milestone');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', clientId] });
      queryClient.invalidateQueries({ queryKey: ['timeline', clientId] });
    },
  });
}

export function useDeleteMilestone(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (milestoneId: string) => {
      const res = await fetch(`/api/clients/${clientId}/milestones?id=${milestoneId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete milestone');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', clientId] });
      queryClient.invalidateQueries({ queryKey: ['timeline', clientId] });
    },
  });
}

// ============================================================
// TIMELINE
// ============================================================

export function useTimeline(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['timeline', clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/timeline`);
      if (!res.ok) throw new Error('Failed to fetch timeline');
      return res.json();
    },
    enabled: !!clientId && !!user,
    refetchInterval: 30000, // Auto-refresh every 30s
  });
}

export function useAddComment(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { content: string; mentions?: { user_id: string; display_name: string }[] }) => {
      const res = await fetch(`/api/clients/${clientId}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add comment');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline', clientId] });
    },
  });
}

// Upload a document to the timeline
export function useUploadDocument(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { file: File; description?: string }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      if (data.description) {
        formData.append('description', data.description);
      }
      const res = await fetch(`/api/clients/${clientId}/timeline/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to upload document');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
    },
  });
}

// Approve, reject, or request changes on a milestone
export function useApproveMilestone(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { milestoneId: string; action: 'approve' | 'reject' | 'request_changes'; reason?: string }) => {
      const res = await fetch(`/api/clients/${clientId}/milestones/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to process approval');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', clientId] });
      queryClient.invalidateQueries({ queryKey: ['timeline', clientId] });
    },
  });
}

// ============================================================
// TEAM FEED & STATS (for dashboard)
// ============================================================

export function useTeamFeed() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['team-feed'],
    queryFn: async () => {
      const res = await fetch('/api/clients/collaboration/feed');
      if (!res.ok) throw new Error('Failed to fetch team feed');
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}

export function useCollaborationStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['collaboration-stats'],
    queryFn: async () => {
      const res = await fetch('/api/clients/collaboration/stats');
      if (!res.ok) throw new Error('Failed to fetch collaboration stats');
      return res.json();
    },
    enabled: !!user,
  });
}

export function usePendingInvites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pending-invites'],
    queryFn: async () => {
      const res = await fetch('/api/clients/collaboration/invites');
      if (!res.ok) throw new Error('Failed to fetch pending invites');
      return res.json();
    },
    enabled: !!user,
  });
}
