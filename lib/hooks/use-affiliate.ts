'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/supabase/auth-context';
import type {
  Affiliate,
  AffiliateStats,
  AffiliateReferral,
  AffiliateCommission,
  AffiliatePayout,
  AffiliateResource,
} from '@/lib/types/affiliate';

// ===================== Affiliate Profile =====================

export function useAffiliateProfile() {
  const { user } = useAuth();
  return useQuery<{ affiliate: Affiliate; stats: AffiliateStats } | null>({
    queryKey: ['affiliate-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/affiliate?userId=${user.id}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch affiliate profile');
      }
      return res.json();
    },
    enabled: !!user?.id,
  });
}

export function useUpdateAffiliateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Affiliate>) => {
      const res = await fetch('/api/affiliate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, ...updates }),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-profile'] });
    },
  });
}

// ===================== Affiliate Registration =====================

export function useRegisterAffiliate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      userId: string;
      email: string;
      fullName: string;
      phone?: string;
      company?: string;
      referralCode?: string;
    }) => {
      const res = await fetch('/api/affiliate/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to register as affiliate');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-profile'] });
    },
  });
}

// ===================== Referrals =====================

export function useAffiliateReferrals(status?: string) {
  const { user } = useAuth();
  return useQuery<AffiliateReferral[]>({
    queryKey: ['affiliate-referrals', user?.id, status],
    queryFn: async () => {
      if (!user?.id) return [];
      const params = new URLSearchParams({ userId: user.id });
      if (status) params.set('status', status);
      const res = await fetch(`/api/affiliate/referrals?${params}`);
      if (!res.ok) throw new Error('Failed to fetch referrals');
      const data = await res.json();
      return data.referrals;
    },
    enabled: !!user?.id,
  });
}

// ===================== Commissions =====================

export function useAffiliateCommissions(status?: string) {
  const { user } = useAuth();
  return useQuery<{
    commissions: AffiliateCommission[];
    summary: {
      current_balance: number;
      pending_balance: number;
      total_paid: number;
      total_earned: number;
    };
  }>({
    queryKey: ['affiliate-commissions', user?.id, status],
    queryFn: async () => {
      if (!user?.id) return { commissions: [], summary: { current_balance: 0, pending_balance: 0, total_paid: 0, total_earned: 0 } };
      const params = new URLSearchParams({ userId: user.id });
      if (status) params.set('status', status);
      const res = await fetch(`/api/affiliate/commissions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch commissions');
      return res.json();
    },
    enabled: !!user?.id,
  });
}

// ===================== Payouts =====================

export function useAffiliatePayouts() {
  const { user } = useAuth();
  return useQuery<{
    payouts: AffiliatePayout[];
    available_balance: number;
    minimum_payout: number;
    payout_method: string | null;
  }>({
    queryKey: ['affiliate-payouts', user?.id],
    queryFn: async () => {
      if (!user?.id) return { payouts: [], available_balance: 0, minimum_payout: 50, payout_method: null };
      const res = await fetch(`/api/affiliate/payouts?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch payouts');
      return res.json();
    },
    enabled: !!user?.id,
  });
}

export function useRequestPayout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch('/api/affiliate/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, amount }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to request payout');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-profile'] });
    },
  });
}

// ===================== Resources =====================

export function useAffiliateResources() {
  return useQuery<AffiliateResource[]>({
    queryKey: ['affiliate-resources'],
    queryFn: async () => {
      const res = await fetch('/api/affiliate/resources');
      if (!res.ok) throw new Error('Failed to fetch resources');
      const data = await res.json();
      return data.resources;
    },
  });
}
